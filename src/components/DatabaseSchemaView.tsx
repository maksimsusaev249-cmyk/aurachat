import React, { useState } from 'react';
import { sqlDDL } from '../data/sqlSchema';
import { Database, Copy, Check, Table, Key, Hash, FileCode2, Sparkles } from 'lucide-react';

const tablesSummary = [
  { name: 'users', desc: 'Учетные записи, @username, флаги приватности (is_private, hide_contacts, hide_online_status)' },
  { name: 'otp_verifications', desc: 'Хэши 6-значных OTP кодов с ограничением 3 попыток и 5 мин TTL' },
  { name: 'chats', desc: 'Диалоги (direct), групповые чаты (group) и каналы (channel) с инвайт-ссылками' },
  { name: 'chat_members', desc: 'Участники с ролями (owner, admin, member) и granular правами в JSONB' },
  { name: 'chat_topics', desc: 'Форумные ветки-топики внутри групп/каналов с иконками' },
  { name: 'messages', desc: 'Сообщения с поддержкой тредов, кружочков, аудио, медиа и статусов удаления' },
  { name: 'media', desc: 'Метаданные файлов: URL в S3/CDN, превью, длительность кружочков/аудио, размеры' },
  { name: 'posts', desc: 'Посты, Reels и 24-часовые Stories с полем expires_at и счетчиками лайков' },
  { name: 'post_comments', desc: 'Древовидные ветки комментариев (threads) к публикациям и Reels' }
];

export const DatabaseSchemaView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlDDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" /> PostgreSQL 16+ Production DDL
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Реляционная схема базы данных</h2>
          <p className="text-sm text-slate-400 mt-1">
            Минимальный, нормализованный DDL с составными индексами под высокую нагрузку real-time чатов.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition shadow-lg shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопировано!' : 'Скопировать весь DDL'}
        </button>
      </div>

      {/* Tables Quick Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tablesSummary.map((t) => (
          <div
            key={t.name}
            onClick={() => setSelectedTable(selectedTable === t.name ? null : t.name)}
            className={`cursor-pointer p-4 rounded-xl border transition ${
              selectedTable === t.name
                ? 'bg-purple-900/20 border-purple-500 text-purple-200'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-purple-400" /> {t.name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                SQL Entity
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>

      {/* SQL Code View */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-slate-200">schema.sql (PostgreSQL)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-400"><Key className="w-3 h-3 text-amber-400" /> UUID Primary Keys</span>
            <span className="flex items-center gap-1 text-slate-400"><Hash className="w-3 h-3 text-sky-400" /> B-Tree & Partial Indexes</span>
          </div>
        </div>

        <div className="p-5 overflow-x-auto max-h-[600px] overflow-y-auto text-xs font-mono leading-relaxed text-slate-300 scrollbar-thin">
          <pre>{sqlDDL}</pre>
        </div>
      </div>
    </div>
  );
};
