export const vanillaClientHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaChat Client (HTML + Vanilla JS)</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #334155;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .container { width: 100%; max-width: 480px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    .header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .header h2 { font-size: 1.15rem; font-weight: 700; color: #60a5fa; }
    .status-badge { font-size: 0.75rem; padding: 4px 10px; border-radius: 9999px; background: #374151; color: var(--muted); }
    .status-badge.connected { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .content-box { padding: 24px; }
    .hidden { display: none !important; }
    
    /* Forms */
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 6px; }
    input[type="text"], input[type="file"] { width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 0.95rem; outline: none; }
    input[type="text"]:focus { border-color: var(--accent); ring: 2px rgba(37,99,235,0.2); }
    .btn { width: 100%; padding: 12px; background: var(--accent); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: var(--accent-hover); }
    .btn-secondary { background: #334155; margin-top: 8px; }
    .btn-secondary:hover { background: #475569; }
    .hint { font-size: 0.8rem; color: var(--muted); margin-top: 6px; text-align: center; }
    
    /* Chat UI */
    .chat-container { display: flex; flex-direction: column; height: 500px; }
    .messages-list { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #0b1120; }
    .bubble { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 0.9rem; line-height: 1.4; word-break: break-word; }
    .bubble.sent { align-self: flex-end; background: #2563eb; color: white; border-bottom-right-radius: 4px; }
    .bubble.received { align-self: flex-start; background: #1e293b; color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border); }
    .bubble .author { font-size: 0.72rem; color: #93c5fd; margin-bottom: 2px; }
    .bubble .time { font-size: 0.68rem; opacity: 0.7; text-align: right; margin-top: 4px; }
    .bubble img { max-width: 100%; border-radius: 8px; margin-top: 6px; display: block; }
    
    .chat-inputs { padding: 12px; border-top: 1px solid var(--border); background: var(--card); display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 8px; align-items: center; }
    .file-label { padding: 8px 12px; background: #334155; border-radius: 8px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
    .file-label:hover { background: #475569; }
  </style>
</head>
<body>

<div class="container">
  <div class="header">
    <h2>⚡ NovaChat Messenger</h2>
    <span id="connectionBadge" class="status-badge">Offline</span>
  </div>

  <!-- ШАГ 1: Ввод номера или почты -->
  <div id="stepRequestOtp" class="content-box">
    <div class="form-group">
      <label>Телефон (+79991234567) или Email:</label>
      <input type="text" id="targetInput" placeholder="+7 999 000-00-00 или user@mail.com" value="+79990001122">
    </div>
    <button class="btn" id="sendOtpBtn">Получить 6-значный код (OTP)</button>
    <p class="hint">Код генерируется криптографически стойким генератором на бэкенде.</p>
  </div>

  <!-- ШАГ 2: Ввод полученного OTP -->
  <div id="stepVerifyOtp" class="content-box hidden">
    <div class="form-group">
      <label id="verifyTargetLabel">Введите 6-значный код:</label>
      <input type="text" id="otpCodeInput" placeholder="123456" maxlength="6" style="letter-spacing: 4px; font-weight: bold; font-size: 1.2rem; text-align: center;">
    </div>
    <button class="btn" id="verifyOtpBtn">Войти в мессенджер</button>
    <button class="btn btn-secondary" id="backToTargetBtn">Назад</button>
    <p id="debugCodeHint" class="hint" style="color: #60a5fa;"></p>
  </div>

  <!-- ШАГ 3: Real-Time Чат через WebSocket -->
  <div id="chatSection" class="chat-container hidden">
    <div class="messages-list" id="messagesList">
      <div class="bubble received">
        <div class="author">System</div>
        <div>Добро пожаловать в защищенный чат NovaChat! Отправляйте сообщения и медиа.</div>
        <div class="time">Сейчас</div>
      </div>
    </div>

    <div class="chat-inputs">
      <div id="filePreview" class="hint hidden" style="text-align: left; color: #34d399;"></div>
      <div class="row">
        <input type="text" id="messageInput" placeholder="Напишите сообщение..." style="flex: 1;">
        <label class="file-label">
          📎 Файл
          <input type="file" id="mediaFileInput" accept="image/*,video/*" style="display: none;">
        </label>
        <button class="btn" id="sendMsgBtn" style="width: auto; padding: 12px 18px;">➤</button>
      </div>
    </div>
  </div>
</div>

<script>
  // ==========================================================================
  // VANILLA JS КЛИЕНТ ДЛЯ NOVACHAT: АВТОРИЗАЦИЯ + WEBSOCKET ОБМЕН
  // ==========================================================================
  
  // Конфигурация API (для production укажите адрес вашего FastAPI / Node сервера)
  const API_BASE = window.location.origin;
  const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/chats/general';

  // Состояние клиента
  let currentTarget = '';
  let authToken = null;
  let currentUserId = null;
  let socket = null;
  let selectedMediaBase64 = null;
  let selectedMediaName = null;

  // DOM Элементы
  const stepRequestOtp = document.getElementById('stepRequestOtp');
  const stepVerifyOtp = document.getElementById('stepVerifyOtp');
  const chatSection = document.getElementById('chatSection');
  const targetInput = document.getElementById('targetInput');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const backToTargetBtn = document.getElementById('backToTargetBtn');
  const debugCodeHint = document.getElementById('debugCodeHint');
  const connectionBadge = document.getElementById('connectionBadge');
  const messagesList = document.getElementById('messagesList');
  const messageInput = document.getElementById('messageInput');
  const mediaFileInput = document.getElementById('mediaFileInput');
  const filePreview = document.getElementById('filePreview');
  const sendMsgBtn = document.getElementById('sendMsgBtn');

  // --- 1. ЗАПРОС OTP КОДА ---
  sendOtpBtn.addEventListener('click', async () => {
    const val = targetInput.value.trim();
    if (!val) return alert('Укажите номер телефона или email');

    currentTarget = val;
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Отправка...';

    try {
      // Отправка POST запроса на бэкенд
      const res = await fetch(\`\${API_BASE}/api/auth/otp/request\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: currentTarget,
          target_type: currentTarget.includes('@') ? 'email' : 'phone'
        })
      });
      const data = await res.json();
      
      stepRequestOtp.classList.add('hidden');
      stepVerifyOtp.classList.remove('hidden');
      
      if (data.debug_code) {
        debugCodeHint.textContent = 'Код подтверждения (тест): ' + data.debug_code;
        otpCodeInput.value = data.debug_code;
      }
    } catch (err) {
      console.warn('Сервер недоступен, режим эмуляции OTP для демонстрации');
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      stepRequestOtp.classList.add('hidden');
      stepVerifyOtp.classList.remove('hidden');
      debugCodeHint.textContent = 'Демонстрационный код: ' + mockCode;
      otpCodeInput.value = mockCode;
      window.__mockOtp = mockCode;
    } finally {
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = 'Получить 6-значный код (OTP)';
    }
  });

  backToTargetBtn.addEventListener('click', () => {
    stepVerifyOtp.classList.add('hidden');
    stepRequestOtp.classList.remove('hidden');
  });

  // --- 2. ВЕРИФИКАЦИЯ OTP И ВЫПУСК JWT ---
  verifyOtpBtn.addEventListener('click', async () => {
    const code = otpCodeInput.value.trim();
    if (code.length !== 6) return alert('Введите 6 цифр кода');

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.textContent = 'Проверка...';

    try {
      const res = await fetch(\`\${API_BASE}/api/auth/otp/verify\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: currentTarget, code: code })
      });
      
      if (!res.ok) throw new Error('Неверный код подтверждения');
      const data = await res.json();
      
      authToken = data.access_token;
      currentUserId = data.user_id;
      initChatSession();
    } catch (err) {
      // Если оффлайн / демо-режим:
      if (window.__mockOtp && window.__mockOtp === code) {
        authToken = 'mock_jwt_token_' + Date.now();
        currentUserId = 'usr_' + Math.random().toString(36).substring(7);
        initChatSession();
      } else {
        alert('Ошибка проверки кода: ' + err.message);
      }
    } finally {
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.textContent = 'Войти в мессенджер';
    }
  });

  // --- 3. ИНИЦИАЛИЗАЦИЯ И ПОДКЛЮЧЕНИЕ К WEBSOCKET ---
  function initChatSession() {
    stepVerifyOtp.classList.add('hidden');
    chatSection.classList.remove('hidden');

    connectWebSocket();
  }

  function connectWebSocket() {
    connectionBadge.textContent = 'Connecting...';
    connectionBadge.classList.remove('connected');

    try {
      socket = new WebSocket(\`\${WS_URL}?token=\${authToken}\`);

      socket.onopen = () => {
        connectionBadge.textContent = 'Online (WS)';
        connectionBadge.classList.add('connected');
        console.log('[WS] Соединение успешно установлено');
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          renderMessage(msg);
        } catch (e) {
          console.error('[WS] Ошибка парсинга сообщения:', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('[WS] Ошибка сокета', err);
      };

      socket.onclose = () => {
        connectionBadge.textContent = 'Offline';
        connectionBadge.classList.remove('connected');
        // Автоматический реконнект через 3 секунды
        setTimeout(connectWebSocket, 3000);
      };
    } catch (e) {
      console.warn('WS fallback на локальный симулятор');
      connectionBadge.textContent = 'Demo Mode (Local)';
      connectionBadge.classList.add('connected');
    }
  }

  // --- 4. ВЫБОР И КОНВЕРТАЦИЯ МЕДИАФАЙЛА (BASE64 / BLOB) ---
  mediaFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      return alert('Файл превышает 10 МБ');
    }

    const reader = new FileReader();
    reader.onload = () => {
      selectedMediaBase64 = reader.result;
      selectedMediaName = file.name;
      filePreview.textContent = 'Прикреплен файл: ' + file.name;
      filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });

  // --- 5. ОТПРАВКА СООБЩЕНИЯ (ТЕКСТ / МЕДИА) ЧЕРЕЗ WEBSOCKET ---
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !selectedMediaBase64) return;

    const payload = {
      type: selectedMediaBase64 ? 'media' : 'text',
      content: text,
      media_url: selectedMediaBase64,
      fileName: selectedMediaName,
      sender_id: currentUserId,
      timestamp: new Date().toISOString()
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      // Локальная визуализация
      renderMessage({
        ...payload,
        id: 'msg_local_' + Date.now()
      });
    }

    // Сброс полей ввода
    messageInput.value = '';
    selectedMediaBase64 = null;
    selectedMediaName = null;
    mediaFileInput.value = '';
    filePreview.classList.add('hidden');
  }

  sendMsgBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Отрисовка сообщения в UI
  function renderMessage(msg) {
    const isMe = msg.sender_id === currentUserId;
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (isMe ? 'sent' : 'received');

    let html = \`<div class="author">\${isMe ? 'Вы' : (msg.sender_id || 'User')}</div>\`;
    if (msg.content) {
      html += \`<div>\${escapeHtml(msg.content)}</div>\`;
    }
    if (msg.media_url) {
      html += \`<img src="\${msg.media_url}" alt="Вложенное медиа" />\`;
    }
    const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    html += \`<div class="time">\${time}</div>\`;

    bubble.innerHTML = html;
    messagesList.appendChild(bubble);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
</script>

</body>
</html>
`;
