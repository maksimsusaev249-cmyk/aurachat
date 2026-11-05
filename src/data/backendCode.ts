export const fastApiBackendCode = `# ==============================================================================
# NOVACHAT BACKEND: FASTAPI + ASYNC REDIS + WEBSOCKETS (Python 3.11+)
# ==============================================================================
# Запуск: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Зависимости: fastapi uvicorn redis python-jose[cryptography] passlib pydantic

import os
import secrets
import hashlib
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from jose import jwt, JWTError

# --- Конфигурация ---
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-telegramm-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа
OTP_EXPIRE_SECONDS = 300  # 5 минут

app = FastAPI(title="NovaChat Core API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Имитация Redis хранилища для OTP (в проде: redis.asyncio.from_url) ---
# Структура: { target: { "hash": str, "expires": float, "attempts": int } }
otp_storage: Dict[str, dict] = {}

# --- Pydantic Схемы ---
class OTPRequest(BaseModel):
    target: str = Field(..., description="Номер телефона (+79991234567) или Email")
    target_type: str = Field(..., regex="^(phone|email)$")

class OTPVerify(BaseModel):
    target: str
    code: str = Field(..., min_length=6, max_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    target: str

# Хелпер хэширования OTP
def hash_otp(code: str, salt: str = "tele_salt_2026") -> str:
    return hashlib.sha256(f"{code}:{salt}".encode()).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

# ------------------------------------------------------------------------------
# 1. ЭНДПОИНТ ГЕНЕРАЦИИ OTP (PHONE / EMAIL)
# ------------------------------------------------------------------------------
@app.post("/api/auth/otp/request", status_code=status.HTTP_200_OK)
async def request_otp(payload: OTPRequest):
    # Генерация криптографически стойкого 6-значного кода
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hash_otp(otp_code)

    # Сохраняем в Redis с TTL
    otp_storage[payload.target] = {
        "hash": code_hash,
        "expires": time.time() + OTP_EXPIRE_SECONDS,
        "attempts": 3,
        "target_type": payload.target_type
    }

    # В production здесь вызывается SMS шлюз (Twilio/SMSC) или SMTP (SendGrid/AWS SES)
    print(f"[AUTH GATEWAY] Отправлен OTP код для {payload.target}: {otp_code}")

    return {
        "status": "success",
        "message": f"Код подтверждения отправлен на {payload.target}",
        "expires_in_sec": OTP_EXPIRE_SECONDS,
        # В режиме разработки возвращаем debug_code для удобного тестирования
        "debug_code": otp_code
    }

# ------------------------------------------------------------------------------
# 2. ЭНДПОИНТ ПРОВЕРКИ OTP И ВЫПУСКА JWT
# ------------------------------------------------------------------------------
@app.post("/api/auth/otp/verify", response_model=TokenResponse)
async def verify_otp(payload: OTPVerify):
    record = otp_storage.get(payload.target)

    if not record:
        raise HTTPException(status_code=400, detail="Код не запрашивался или срок действия истек")

    if time.time() > record["expires"]:
        otp_storage.pop(payload.target, None)
        raise HTTPException(status_code=400, detail="Срок действия OTP-кода истек (лимит 5 мин)")

    if record["attempts"] <= 0:
        otp_storage.pop(payload.target, None)
        raise HTTPException(status_code=429, detail="Превышено число попыток ввода. Запросите код снова")

    incoming_hash = hash_otp(payload.code)
    if incoming_hash != record["hash"]:
        record["attempts"] -= 1
        raise HTTPException(status_code=400, detail=f"Неверный код. Осталось попыток: {record['attempts']}")

    # Успешная верификация: удаляем OTP из кэша
    otp_storage.pop(payload.target, None)

    # Идентификатор пользователя (детерминированный UUID на базе контакта или поиск в Postgres)
    user_id = f"usr_{hashlib.md5(payload.target.encode()).hexdigest()[:12]}"

    token = create_access_token(
        data={"sub": user_id, "target": payload.target},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(access_token=token, user_id=user_id, target=payload.target)

# ------------------------------------------------------------------------------
# 3. WEBSOCKET МЕНЕДЖЕР РЕАЛЬНОГО ВРЕМЕНИ
# ------------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        # chat_id -> dict of { user_id: WebSocket }
        self.active_rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, chat_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if chat_id not in self.active_rooms:
            self.active_rooms[chat_id] = {}
        self.active_rooms[chat_id][user_id] = websocket
        
        # Оповещение комнаты о входе пользователя
        await self.broadcast_to_chat(chat_id, {
            "type": "user_presence",
            "user_id": user_id,
            "status": "online",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)

    def disconnect(self, chat_id: str, user_id: str):
        if chat_id in self.active_rooms:
            self.active_rooms[chat_id].pop(user_id, None)
            if not self.active_rooms[chat_id]:
                self.active_rooms.pop(chat_id, None)

    async def broadcast_to_chat(self, chat_id: str, message: dict, exclude_user: Optional[str] = None):
        if chat_id in self.active_rooms:
            for uid, ws in list(self.active_rooms[chat_id].items()):
                if uid != exclude_user:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()

# WebSocket эндпоинт чата
@app.websocket("/ws/chats/{chat_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    chat_id: str,
    token: str = Query(...)
):
    # Валидация JWT токена перед установкой постоянного соединения
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(chat_id, user_id, websocket)

    try:
        while True:
            # Ожидание входящего события (текст, медиа, кружочек, аудио, typing, WebRTC SDP)
            data = await websocket.receive_json()
            event_type = data.get("type", "message")

            payload_out = {
                "id": f"msg_{secrets.token_hex(8)}",
                "chat_id": chat_id,
                "sender_id": user_id,
                "type": data.get("message_type", "text"), # text, media, voice, video_note
                "content": data.get("content", ""),
                "media_url": data.get("media_url"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Обработка статуса набора текста ("печатает...")
            if event_type == "typing":
                await manager.broadcast_to_chat(chat_id, {
                    "type": "user_typing",
                    "user_id": user_id,
                    "is_typing": data.get("is_typing", True)
                }, exclude_user=user_id)
                continue

            # Рассылка сообщения всем участникам чата
            await manager.broadcast_to_chat(chat_id, payload_out)

    except WebSocketDisconnect:
        manager.disconnect(chat_id, user_id)
        await manager.broadcast_to_chat(chat_id, {
            "type": "user_presence",
            "user_id": user_id,
            "status": "offline",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
`;

export const nodeJsBackendCode = `// ==============================================================================
// NOVACHAT BACKEND: NODE.JS + EXPRESS + WS + JWT (TypeScript / ES Module)
// ==============================================================================
// Запуск: tsx server.ts
// Зависимости: npm i express ws jsonwebtoken cors crypto

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-telegramm-production';
const OTP_EXPIRE_MS = 5 * 60 * 1000; // 5 минут

// Хранилище OTP (в production: Redis redisClient.setEx / get)
interface OtpEntry {
  hash: string;
  expiresAt: number;
  attemptsLeft: number;
}
const otpStore = new Map<string, OtpEntry>();

const hashOtp = (code: string) => 
  crypto.createHash('sha256').update(code + 'salt_tele_2026').digest('hex');

// 1. Запрос 6-значного OTP
app.post('/api/auth/otp/request', (req: Request, res: Response) => {
  const { target, target_type } = req.body;
  if (!target) return res.status(400).json({ error: 'Target is required' });

  // Генерация 6-значного случайного числа
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(target, {
    hash: hashOtp(code),
    expiresAt: Date.now() + OTP_EXPIRE_MS,
    attemptsLeft: 3,
  });

  console.log(\`[SMS/EMAIL GATEWAY] Отправлен код на \${target}: \${code}\`);
  return res.json({
    status: 'success',
    message: \`Код выслан на \${target}\`,
    expires_in_sec: 300,
    debug_code: code // Для удобства отладки
  });
});

// 2. Верификация OTP и выдача JWT токена
app.post('/api/auth/otp/verify', (req: Request, res: Response) => {
  const { target, code } = req.body;
  const record = otpStore.get(target);

  if (!record || Date.now() > record.expiresAt) {
    otpStore.delete(target);
    return res.status(400).json({ error: 'Код истек или не существует' });
  }

  if (record.attemptsLeft <= 0) {
    otpStore.delete(target);
    return res.status(429).json({ error: 'Превышен лимит попыток' });
  }

  if (hashOtp(code) !== record.hash) {
    record.attemptsLeft -= 1;
    return res.status(400).json({ error: \`Неверный код. Осталось: \${record.attemptsLeft}\` });
  }

  otpStore.delete(target);
  const userId = 'usr_' + crypto.createHash('md5').update(target).digest('hex').slice(0, 10);
  const token = jwt.sign({ sub: userId, target }, JWT_SECRET, { expiresIn: '24h' });

  return res.json({ access_token: token, user_id: userId, target });
});

// 3. WebSocket Real-time Сервер
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Map: chatId -> Set of WebSockets
const rooms = new Map<string, Set<WebSocket & { userId?: string }>>();

wss.on('connection', (ws: WebSocket & { userId?: string }, req) => {
  const url = new URL(req.url || '', \`http://\${req.headers.host}\`);
  const token = url.searchParams.get('token');
  const chatId = url.searchParams.get('chat_id') || 'general';

  try {
    const decoded = jwt.verify(token || '', JWT_SECRET) as { sub: string };
    ws.userId = decoded.sub;
  } catch {
    ws.close(1008, 'Unauthorized JWT');
    return;
  }

  if (!rooms.has(chatId)) rooms.set(chatId, new Set());
  rooms.get(chatId)!.add(ws);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const messageEnvelope = {
        id: 'msg_' + crypto.randomUUID(),
        chat_id: chatId,
        sender_id: ws.userId,
        type: data.type || 'text', // text, voice, video_note, media
        content: data.content,
        media_url: data.media_url,
        timestamp: new Date().toISOString()
      };

      // Рассылка всем в комнате
      const room = rooms.get(chatId);
      if (room) {
        const payload = JSON.stringify(messageEnvelope);
        for (const client of room) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }
    } catch (e) {
      console.error('Ошибка парсинга WS пакета', e);
    }
  });

  ws.on('close', () => {
    rooms.get(chatId)?.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(\`NovaChat Backend слушает на порту \${PORT}\`);
});
`;
