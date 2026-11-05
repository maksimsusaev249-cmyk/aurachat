import React, { useState } from 'react';
import { X, Hash, Plus, ShieldCheck, Lock, Sparkles } from 'lucide-react';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'owner' | 'admin' | 'member';
  chatTitle: string;
  onCreateTopic: (title: string, icon: string) => void;
}

const emojiList = ['💬', '📢', '🚀', '🛠️', '📹', '📞', '💡', '🎨', '⚡', '🔒', '🎮', '📊'];

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  isOpen,
  onClose,
  userRole,
  chatTitle,
  onCreateTopic
}) => {
  const [title, setTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');

  if (!isOpen) return null;

  const isAllowed = userRole === 'owner' || userRole === 'admin';

  const handleCreate = () => {
    if (!title.trim() || !isAllowed) return;
    onCreateTopic(title.trim(), selectedEmoji);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-[#202b36]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-5 h-5 text-[#5288c1]" />
          <h3 className="text-base font-bold text-white">Создание ветки-топика</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 truncate">
          В группе/канале: <span className="text-slate-200">{chatTitle}</span>
        </p>

        {/* Permission status box */}
        <div className={`p-3 rounded-2xl mb-4 border text-xs flex items-center justify-between ${
          isAllowed
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {isAllowed ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                Ваша роль: {userRole === 'owner' ? '👑 Владелец' : userRole === 'admin' ? '🛡️ Модератор / Админ' : '👤 Участник'}
              </div>
              <div className="text-[10px] opacity-80">
                {isAllowed
                  ? 'Право на создание веток подтверждено (RBAC)'
                  : 'Запрещено: ветки могут создавать только Владелец или Модератор'}
              </div>
            </div>
          </div>
        </div>

        {isAllowed ? (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Иконка топика:</label>
              <div className="flex flex-wrap gap-2 p-2 bg-[#242f3d] rounded-2xl border border-[#283748]">
                {emojiList.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setSelectedEmoji(e)}
                    className={`text-lg p-1.5 rounded-xl transition ${
                      selectedEmoji === e
                        ? 'bg-[#5288c1] scale-110 shadow'
                        : 'hover:bg-[#1e2a38]'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Название ветки-топика:</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-base">{selectedEmoji}</span>
                <input
                  type="text"
                  placeholder="Например: Обсуждение релиза, Баги, Фронтенд..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-[#242f3d] border border-[#283748] rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#5288c1]"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!title.trim()}
              className="w-full py-3 bg-[#5288c1] hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Создать ветку
            </button>
          </div>
        ) : (
          <div className="p-4 bg-[#242f3d] rounded-2xl text-center space-y-2 border border-[#283748]">
            <p className="text-xs text-slate-300">
              В соответствии с требованиями безопасности, в публичных и приватных группах/каналах добавлять новые тематические ветки разрешено исключительно <strong>Владельцу</strong> (owner) или <strong>Модераторам</strong> (admin).
            </p>
            <p className="text-[11px] text-slate-400">
              Вы можете переключить тестовую роль в заголовке чата, чтобы опробовать создание веток от лица Владельца или Модератора.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 bg-[#334155] hover:bg-slate-600 text-white text-xs rounded-xl font-bold transition"
            >
              Понятно
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
