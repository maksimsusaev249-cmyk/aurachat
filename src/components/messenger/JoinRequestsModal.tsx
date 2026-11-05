import React from 'react';
import { Chat, JoinRequest } from '../../types';
import { X, Check, Trash2, ShieldCheck, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { playSentSound, playReactionSound } from '../../utils/audioUtils';

interface JoinRequestsModalProps {
  isOpen: boolean;
  chat: Chat;
  onClose: () => void;
  onApproveRequest: (chatId: string, request: JoinRequest) => void;
  onDeclineRequest: (chatId: string, requestId: string) => void;
}

export const JoinRequestsModal: React.FC<JoinRequestsModalProps> = ({
  isOpen,
  chat,
  onClose,
  onApproveRequest,
  onDeclineRequest
}) => {
  if (!isOpen) return null;

  const requests = chat.joinRequests || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-md p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Заявки на вступление</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 truncate">
          В чат: <strong className="text-slate-200">{chat.title}</strong>
        </p>

        {requests.length === 0 ? (
          <div className="p-8 bg-[#1e2a38] rounded-2xl text-center space-y-2 border border-[#283748]">
            <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-xs font-semibold text-white">Нет ожидающих заявок</div>
            <p className="text-[11px] text-slate-400">
              Все пользователи, подававшие заявку по ссылке или QR-коду, уже рассмотрены.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-3 bg-[#1e2a38] rounded-2xl border border-[#283748] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={req.userAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-600"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-white truncate">
                      {req.userName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      @{req.username} • {req.requestedAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      playSentSound();
                      onApproveRequest(chat.id, req);
                    }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow flex items-center gap-1 text-xs font-bold cursor-pointer"
                    title="Одобрить заявку (добавить в группу)"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Одобрить</span>
                  </button>

                  <button
                    onClick={() => {
                      playReactionSound();
                      onDeclineRequest(chat.id, req.id);
                    }}
                    className="p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl transition border border-slate-700 cursor-pointer"
                    title="Отклонить заявку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[#334155] hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};
