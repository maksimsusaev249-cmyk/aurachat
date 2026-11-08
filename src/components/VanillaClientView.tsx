import React, { useState } from 'react';
import { vanillaClientHtml } from '../data/vanillaClientCode';
import { Code2, Play, Copy, Check, ExternalLink, Sparkles, MonitorSmartphone } from 'lucide-react';

export const VanillaClientView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(vanillaClientHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2">
            <Code2 className="w-3.5 h-3.5" /> Чистый HTML5 + Vanilla JS
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Рабочий клиент без внешних фреймворков</h2>
          <p className="text-sm text-slate-400 mt-1">
            Форма ввода OTP, валидация, прямое подключение к WebSocket и отправка текста / медиафайлов.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'preview' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorSmartphone className="w-3.5 h-3.5" /> Интерактивный запуск
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> Исходный код (HTML+JS)
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

      {/* Main Content Area */}
      {activeTab === 'preview' ? (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Изолированное песочница-окружение (Sandboxed iFrame)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">index.html standalone</span>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-[500px] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-[#0f172a]">
              <iframe
                title="Vanilla JS Chatix Client"
                srcDoc={vanillaClientHtml}
                sandbox="allow-scripts allow-same-origin allow-forms"
                className="w-full h-[640px] border-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 text-xs text-slate-400">
            <span className="font-mono text-slate-200">index.html (HTML5, CSS3, Vanilla JS)</span>
            <span className="text-[11px] text-slate-500">Zero dependencies</span>
          </div>
          <div className="p-5 overflow-x-auto max-h-[640px] overflow-y-auto text-xs font-mono leading-relaxed text-slate-300 scrollbar-thin">
            <pre>{vanillaClientHtml}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
