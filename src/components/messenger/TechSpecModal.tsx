import React, { useState } from 'react';
import { sqlDDL } from '../../data/sqlSchema';
import { fastApiBackendCode, nodeJsBackendCode } from '../../data/backendCode';
import { vanillaClientHtml } from '../../data/vanillaClientCode';
import { architectureData } from '../../data/architectureDocs';
import { 
  X, 
  Copy, 
  Check, 
  Database, 
  Terminal, 
  Code2, 
  Layers, 
  Server, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface TechSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechSpecModal: React.FC<TechSpecModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'ddl' | 'backend' | 'client'>('ddl');
  const [backendLang, setBackendLang] = useState<'fastapi' | 'nodejs'>('fastapi');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCopyContent = () => {
    switch (activeTab) {
      case 'ddl':
        return sqlDDL;
      case 'backend':
        return backendLang === 'fastapi' ? fastApiBackendCode : nodeJsBackendCode;
      case 'client':
        return vanillaClientHtml;
      case 'architecture':
        return JSON.stringify(architectureData, null, 2);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCopyContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col text-white shadow-2xl relative overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#243344] flex items-center justify-between shrink-0 bg-[#17212b]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Техническая документация и рабочий код платформы
              </h3>
              <p className="text-[11px] text-slate-400">
                PostgreSQL 16+ DDL • FastAPI / Node.js • WebSockets • WebRTC • HTML+JS клиент
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5288c1] hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full bg-[#202b36]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Spec Tabs */}
        <div className="px-6 border-b border-[#243344] bg-[#141d26] flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ddl')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'ddl'
                ? 'border-[#5288c1] text-[#5288c1] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" /> 2. Схема БД (SQL DDL)
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'backend'
                ? 'border-[#5288c1] text-[#5288c1] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" /> 3. Бэкенд (OTP + WS)
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'client'
                ? 'border-[#5288c1] text-[#5288c1] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" /> 4. Клиент (HTML + JS)
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'architecture'
                ? 'border-[#5288c1] text-[#5288c1] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> 1. Архитектурный стек
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0e1621] font-mono text-xs text-slate-200 scrollbar-thin">
          {activeTab === 'ddl' && (
            <pre className="whitespace-pre-wrap leading-relaxed">{sqlDDL}</pre>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setBackendLang('fastapi')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    backendLang === 'fastapi' ? 'bg-[#5288c1] text-white' : 'bg-[#1e2a38] text-slate-400'
                  }`}
                >
                  Python (FastAPI)
                </button>
                <button
                  onClick={() => setBackendLang('nodejs')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    backendLang === 'nodejs' ? 'bg-emerald-600 text-white' : 'bg-[#1e2a38] text-slate-400'
                  }`}
                >
                  Node.js (Express + ws)
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">
                {backendLang === 'fastapi' ? fastApiBackendCode : nodeJsBackendCode}
              </pre>
            </div>
          )}

          {activeTab === 'client' && (
            <pre className="whitespace-pre-wrap leading-relaxed">{vanillaClientHtml}</pre>
          )}

          {activeTab === 'architecture' && (
            <div className="font-sans space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                {architectureData.components.map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#17212b] border border-[#243344]">
                    <div className="font-bold text-[#64b5f6] mb-1">{c.layer}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.technologies.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-[#242f3d] px-2 py-0.5 rounded font-mono text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
