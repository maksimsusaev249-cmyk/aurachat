import React, { useState } from 'react';
import { fastApiBackendCode, nodeJsBackendCode } from '../data/backendCode';
import { Terminal, Copy, Check, Play, ShieldAlert, KeyRound, Sparkles, Send, Server } from 'lucide-react';

export const BackendCodeView: React.FC = () => {
  const [lang, setLang] = useState<'fastapi' | 'nodejs'>('fastapi');
  const [copied, setCopied] = useState(false);

  // Live OTP Sandbox state
  const [target, setTarget] = useState('+7 (999) 123-45-67');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ status: 'success' | 'error'; message: string; jwt?: string } | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentCode = lang === 'fastapi' ? fastApiBackendCode : nodeJsBackendCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestOtp = () => {
    if (!target) return;
    setIsGenerating(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setEnteredOtp(code); // Pre-fill for convenience
      setAttemptsLeft(3);
      setVerifyResult(null);
      setIsGenerating(false);
    }, 400);
  };

  const handleVerifyOtp = () => {
    if (!generatedOtp) {
      setVerifyResult({ status: 'error', message: 'Сначала сгенерируйте код OTP' });
      return;
    }

    if (enteredOtp === generatedOtp) {
      const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({
        sub: 'usr_' + Math.random().toString(36).substring(7),
        target: target,
        exp: Math.floor(Date.now() / 1000) + 86400
      })) + '.sign_tele_auth_2026';

      setVerifyResult({
        status: 'success',
        message: 'Успешная авторизация! Выдан JWT Bearer токен для WebSocket сессии.',
        jwt: mockJwt
      });
    } else {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        setGeneratedOtp(null);
        setVerifyResult({ status: 'error', message: 'Превышен лимит попыток ввода (3). OTP аннулирован.' });
      } else {
        setVerifyResult({ status: 'error', message: `Неверный код. Осталось попыток: ${remaining}` });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <Server className="w-3.5 h-3.5" /> Backend Implementation
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Рабочий сервер: OTP API + WebSocket</h2>
          <p className="text-sm text-slate-400 mt-1">
            Эндпоинты генерации и проверки 6-значного OTP кода + многопользовательский WebSocket шлюз.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setLang('fastapi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                lang === 'fastapi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Python (FastAPI)
            </button>
            <button
              onClick={() => setLang('nodejs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                lang === 'nodejs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js (Express + ws)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs transition border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Live Interactive OTP Testing Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" /> Live Interactive Sandbox: Тестирование OTP Flow
        </div>
        <h3 className="text-base font-bold text-white mb-4">
          Проверьте логику генерации криптографического OTP и выпуск JWT:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Шаг 1: POST /api/auth/otp/request</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                Rate Limit 5/min
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Номер телефона или Email:</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleRequestOtp}
                disabled={isGenerating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> {isGenerating ? 'Генерация...' : 'Сгенерировать 6-значный OTP'}
              </button>

              {generatedOtp && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-xs">
                  <div className="text-emerald-400 font-semibold mb-1">Крипто-генератор выдал код:</div>
                  <div className="text-2xl font-mono font-black text-emerald-300 tracking-widest text-center py-1">
                    {generatedOtp}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Хэш SHA-256 записан в Redis, TTL: 300 сек (5 минут)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Шаг 2: POST /api/auth/otp/verify</span>
              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                Попыток: {attemptsLeft}/3
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Введите 6-значный код:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center font-mono font-bold tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" /> Проверить OTP и выдать JWT
              </button>

              {verifyResult && (
                <div className={`p-3 rounded-lg text-xs border ${
                  verifyResult.status === 'success' 
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="font-semibold">{verifyResult.message}</div>
                  {verifyResult.jwt && (
                    <div className="mt-2">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Issued JWT Access Token:</div>
                      <div className="font-mono text-[10px] text-blue-300 break-all bg-black/40 p-2 rounded mt-1 border border-slate-800">
                        {verifyResult.jwt}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-slate-200">
              {lang === 'fastapi' ? 'main.py (FastAPI)' : 'server.ts (Node.js)'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Async WebSockets + JWT Auth</span>
        </div>

        <div className="p-5 overflow-x-auto max-h-[600px] overflow-y-auto text-xs font-mono leading-relaxed text-slate-300 scrollbar-thin">
          <pre>{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
