import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Search, 
  Send, 
  Sparkles, 
  Link as LinkIcon, 
  Users, 
  Radio, 
  MessageSquare,
  Download,
  Bookmark,
  CheckCircle2,
  Repeat
} from 'lucide-react';
import { Post, Chat } from '../../types';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';

interface ShareReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: Post | null;
  chats: Chat[];
  onSendToChat: (chatId: string, reel: Post, customMsg?: string) => void;
}

export const ShareReelModal: React.FC<ShareReelModalProps> = ({
  isOpen,
  onClose,
  reel,
  chats,
  onSendToChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sentChatIds, setSentChatIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !reel) return null;

  const reelShareUrl = `${window.location.origin}/?reel=${reel.id}`;

  const handleCopyLink = () => {
    if (reel.allowShare === false) {
      alert('🚫 Автор запретил копирование ссылки и пересылку этого видео.');
      return;
    }
    navigator.clipboard.writeText(reelShareUrl).catch(() => {});
    playReactionSound();
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
    }, 2500);
  };

  const handleDownload = () => {
    setIsDownloaded(true);
    downloadMediaFile(
      reel.mediaUrl,
      `reel_${reel.userName || 'clip'}_${reel.id}`,
      reel.mediaType === 'video' ? 'video' : 'image',
      (status) => {
        if (status === 'done') {
          setTimeout(() => setIsDownloaded(false), 2500);
        }
      }
    );
  };

  const handleToggleSave = () => {
    playReactionSound();
    setIsSaved(!isSaved);
  };

  const handleSendToChat = (chatId: string) => {
    if (reel.allowShare === false) {
      alert('🚫 Автор запретил пересылку этого видео.');
      return;
    }
    setSentChatIds((prev) => {
      const next = { ...prev };
      if (next[chatId]) {
        // Cancel / Undo
        delete next[chatId];
        playReactionSound();
      } else {
        // Send
        next[chatId] = true;
        playSentSound();
        onSendToChat(chatId, reel, commentText.trim() || undefined);
      }
      return next;
    });
  };

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.members && c.members.some((m) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Bottom Sheet Card with Slide-Up Animation */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#17212b] border-t sm:border border-[#243344] rounded-t-[28px] sm:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[88vh] text-white animate-in slide-in-from-bottom duration-300 ease-out"
      >
        {/* Mobile Drag Handle Indicator */}
        <div 
          onClick={onClose}
          className="w-12 h-1.5 bg-slate-500/60 hover:bg-slate-400 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer transition shrink-0" 
          title="Потяните или нажмите, чтобы закрыть"
        />

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-[#243344] flex items-center justify-between bg-[#0e1621]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                <span>Поделиться видео</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Рилс</span>
              </h3>
              <p className="text-[11px] text-slate-400">Выберите собеседника или отправьте ссылку</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 scrollbar-thin">
          {/* Quick Action Buttons (Copy Link, Download, Save, Repost) */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleCopyLink}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#0e1621] hover:bg-[#131d2b] border-[#243344] text-cyan-300'
              }`}
            >
              {copiedLink ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-cyan-400" />}
              <span className="text-[11px] truncate">{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
            </button>

            <button
              onClick={handleDownload}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#0e1621] hover:bg-[#131d2b] border-[#243344] text-amber-300'
              }`}
            >
              {isDownloaded ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Download className="w-5 h-5 text-amber-400" />}
              <span className="text-[11px] truncate">{isDownloaded ? 'Сохранено' : 'Скачать'}</span>
            </button>

            <button
              onClick={handleToggleSave}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold cursor-pointer ${
                isSaved
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-[#0e1621] hover:bg-[#131d2b] border-[#243344] text-slate-300'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
              <span className="text-[11px] truncate">{isSaved ? 'В сохранённых' : 'Сохранить'}</span>
            </button>

            <button
              onClick={() => {
                playReactionSound();
                reel.isReposted = !reel.isReposted;
                alert(reel.isReposted ? '✓ Видео успешно репостнут в ваш профиль!' : 'Репост отменен.');
              }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold cursor-pointer ${
                reel.isReposted
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-[#0e1621] hover:bg-[#131d2b] border-[#243344] text-cyan-400'
              }`}
            >
              <Repeat className={`w-5 h-5 ${reel.isReposted ? 'text-cyan-300 animate-pulse' : 'text-cyan-400'}`} />
              <span className="text-[11px] truncate">{reel.isReposted ? 'Репостнут' : 'Репост'}</span>
            </button>
          </div>

          {/* Reel Mini Preview Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0e1621] border border-[#243344]">
            <div className="relative w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
              <img
                src={reel.mediaUrl}
                alt="Reel preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src={reel.userAvatar}
                  alt={reel.userName}
                  className="w-4 h-4 rounded-full object-cover border border-white/20"
                />
                <span className="font-bold text-xs text-rose-300 truncate">@{reel.userName}</span>
              </div>
              <p className="text-xs text-slate-200 line-clamp-1 leading-snug">
                {reel.caption}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="truncate">{reelShareUrl}</span>
              </div>
            </div>
          </div>

          {/* Optional Comment Attached */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Сообщение к видео:</span>
            </label>
            <input
              type="text"
              placeholder="Добавьте подпись перед отправкой..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0e1621] border border-[#243344] text-xs text-white placeholder-slate-500 outline-none focus:border-[#5288c1]"
            />
          </div>

          {/* Search People & Detailed Chat List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Люди, с кем общаешься</span>
              <span className="text-[10px] text-slate-400 font-mono">{filteredChats.length} чатов</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по имени или чату..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0e1621] border border-[#243344] text-xs text-white placeholder-slate-500 outline-none focus:border-[#5288c1]"
              />
            </div>

            {/* List of Chats */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {filteredChats.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Чаты не найдены
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isSent = !!sentChatIds[chat.id];

                  return (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0e1621]/80 hover:bg-[#0e1621] border border-[#243344]/80 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="relative shrink-0">
                          <img
                            src={chat.avatarUrl}
                            alt={chat.title}
                            className="w-10 h-10 rounded-full object-cover border border-[#243344]"
                          />
                          {chat.type === 'group' && (
                            <span className="absolute -bottom-1 -right-1 p-0.5 bg-indigo-600 rounded-full text-white">
                              <Users className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {chat.type === 'channel' && (
                            <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-600 rounded-full text-white">
                              <Radio className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-white truncate group-hover:text-cyan-300 transition">
                            {chat.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {chat.type === 'group' 
                              ? `${chat.membersCount} участников`
                              : chat.type === 'channel'
                              ? 'Канал'
                              : chat.lastMessage || 'Личные сообщения'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToChat(chat.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          isSent
                            ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40'
                            : 'bg-[#5288c1] hover:bg-blue-500 text-white shadow hover:scale-105 active:scale-95'
                        }`}
                        title={isSent ? 'Нажмите, чтобы отменить' : 'Отправить'}
                      >
                        {isSent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Отправлено (отменить)</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Отправить</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#243344] bg-[#0e1621]/80 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">Chatix</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-[#243344] hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

