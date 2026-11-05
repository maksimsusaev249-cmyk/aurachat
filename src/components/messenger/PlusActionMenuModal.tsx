import React from 'react';
import {
  Camera,
  QrCode,
  MessageSquarePlus,
  PhoneCall,
  X,
  Plus,
  Video,
  Users,
  Radio,
  UserPlus,
  Sparkles,
  PhoneMissed
} from 'lucide-react';

interface PlusActionMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCamera: () => void;
  onOpenQRScanner: () => void;
  onOpenCreateChat: (type?: 'group' | 'channel' | 'direct' | 'community') => void;
  onOpenCalls: () => void;
  onStartCallFlow?: () => void;
  onOpenVideoNote?: () => void;
  missedCallsCount?: number;
}

export const PlusActionMenuModal: React.FC<PlusActionMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenCamera,
  onOpenQRScanner,
  onOpenCreateChat,
  onOpenCalls,
  onStartCallFlow,
  onOpenVideoNote,
  missedCallsCount = 0
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="w-full max-w-md bg-[#0e1626] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#131b2e]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Быстрые действия</h3>
              <p className="text-[11px] text-slate-400">Выберите нужный раздел или функцию</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-[#0a0f1c]/90">
          {/* 1. Camera */}
          <button
            onClick={() => {
              onClose();
              onOpenCamera();
            }}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-violet-900/20 border border-indigo-500/30 hover:border-indigo-400 hover:from-indigo-900/60 transition text-left flex flex-col justify-between h-32 cursor-pointer shadow-lg overflow-hidden"
          >
            <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-indigo-500/10 rounded-full blur-lg group-hover:bg-indigo-500/25 transition" />
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Камера</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-[10px] text-indigo-200/70 line-clamp-1 mt-0.5">
                Reels, Пост, История
              </p>
            </div>
          </button>

          {/* 2. QR Code */}
          <button
            onClick={() => {
              onClose();
              onOpenQRScanner();
            }}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 to-emerald-900/20 border border-cyan-500/30 hover:border-cyan-400 hover:from-cyan-900/60 transition text-left flex flex-col justify-between h-32 cursor-pointer shadow-lg overflow-hidden"
          >
            <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-cyan-500/10 rounded-full blur-lg group-hover:bg-cyan-500/25 transition" />
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">КУАР / QR-код</div>
              <p className="text-[10px] text-cyan-200/70 line-clamp-1 mt-0.5">
                Сканер и мой код
              </p>
            </div>
          </button>

          {/* 3. New Chat */}
          <button
            onClick={() => {
              onClose();
              onOpenCreateChat('group');
            }}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/20 border border-amber-500/30 hover:border-amber-400 hover:from-amber-900/60 transition text-left flex flex-col justify-between h-32 cursor-pointer shadow-lg overflow-hidden"
          >
            <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-amber-500/10 rounded-full blur-lg group-hover:bg-amber-500/25 transition" />
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Новый чат</div>
              <p className="text-[10px] text-amber-200/70 line-clamp-1 mt-0.5">
                Группа, канал или ЛС
              </p>
            </div>
          </button>

          {/* 4. Calls */}
          <button
            onClick={() => {
              onClose();
              if (onStartCallFlow) {
                onStartCallFlow();
              } else {
                onOpenCalls();
              }
            }}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border border-emerald-500/30 hover:border-emerald-400 hover:from-emerald-900/60 transition text-left flex flex-col justify-between h-32 cursor-pointer shadow-lg overflow-hidden"
          >
            <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-emerald-500/10 rounded-full blur-lg group-hover:bg-emerald-500/25 transition" />
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner relative">
              <PhoneCall className="w-5 h-5" />
              {missedCallsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                  {missedCallsCount}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center justify-between">
                <span>Начать звонок</span>
                {missedCallsCount > 0 && (
                  <span className="text-[9px] text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                    +{missedCallsCount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-200/70 line-clamp-1 mt-0.5">
                Выбор собеседников
              </p>
            </div>
          </button>
        </div>

        {/* Quick Sub-Actions Bar */}
        <div className="p-3 bg-[#131b2e]/90 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onClose();
              onOpenCreateChat('direct');
            }}
            className="flex-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>ЛС</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCreateChat('channel');
            }}
            className="flex-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Канал</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCreateChat('community');
            }}
            className="flex-1 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Сообщество</span>
          </button>

          {onOpenVideoNote && (
            <button
              onClick={() => {
                onClose();
                onOpenVideoNote();
              }}
              className="flex-1 py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span>Кружочек</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
