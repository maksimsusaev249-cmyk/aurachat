import React, { useState } from 'react';
import { architectureData } from '../data/architectureDocs';
import { Layers, Shield, Cpu, Database, Radio, Server, CheckCircle2, ChevronRight, Lock, EyeOff, UserCheck, Flame, Zap } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" /> High-Load Social & Messaging Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {architectureData.title}
            </h1>
            <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              {architectureData.summary}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Production Grade
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium flex items-center gap-1.5">
              <Radio className="w-4 h-4" /> WebRTC + WS SFU
            </span>
          </div>
        </div>
      </div>

      {/* 4 Architectural Layers */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" /> Архитектурный стек слоёв (C4 Container View)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {architectureData.components.map((layer, idx) => {
            const icons = [
              <Cpu key="0" className="w-5 h-5 text-sky-400" />,
              <Server key="1" className="w-5 h-5 text-emerald-400" />,
              <Radio key="2" className="w-5 h-5 text-amber-400" />,
              <Database key="3" className="w-5 h-5 text-purple-400" />
            ];

            return (
              <div 
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                      {icons[idx]}
                    </div>
                    <h3 className="text-base font-bold text-white">{layer.layer}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {layer.technologies.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 text-xs font-mono">
                      {t}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  {layer.description}
                </p>

                <div className="border-t border-slate-800/80 pt-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Ключевые инженерные решения:
                  </div>
                  <ul className="space-y-1.5">
                    {layer.features.map((f, fi) => (
                      <li key={fi} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">▪</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Data Flows */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> Интерактивный Data Flow: Жизненный цикл процессов
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Выберите шаг, чтобы проследить сквозное прохождение пакетов и сигналов между клиентом, брокером и хранилищем:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {architectureData.dataFlow.map((df, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`p-3 rounded-xl text-left border transition text-xs font-medium ${
                activeStep === i
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-white mb-1 truncate">{df.step.split(' ')[1]}</div>
              <div className="text-[11px] opacity-80 truncate">{df.step}</div>
            </button>
          ))}
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-2">
            <ChevronRight className="w-4 h-4" /> {architectureData.dataFlow[activeStep].step}
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-mono bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            {architectureData.dataFlow[activeStep].detail}
          </p>
        </div>
      </div>

      {/* Privacy Matrix & Security */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
            <EyeOff className="w-4 h-4" /> Ghost Mode (Скрытие статуса)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Пользователь скрывает online/last_seen. Redis Presence Worker отсекает broadcasting статуса для неавторизованных связей, возвращая маску <i>«был недавно»</i>.
          </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-2">
            <Lock className="w-4 h-4" /> Маскирование контактов
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Номер телефона и email скрыты флагом <code className="text-blue-300">hide_contacts = TRUE</code>. В API отдается только уникальный <code className="text-blue-300">@username</code>.
          </p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
            <Flame className="w-4 h-4" /> Stories 24h Expiry
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Связка S3 Object Expiration Lifecycle Rule (автоудаление файлов через 24ч) и Postgres частичный индекс <code className="text-blue-300">expires_at &gt; NOW()</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
