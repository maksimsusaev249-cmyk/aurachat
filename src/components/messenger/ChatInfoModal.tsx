import React, { useState, useRef } from 'react';
import { Chat, Message, User } from '../../types';
import { 
  X, 
  Bell, 
  BellOff, 
  Phone, 
  Video, 
  MoreHorizontal, 
  ChevronRight, 
  ChevronLeft, 
  ShieldAlert, 
  User as UserIcon, 
  Trash2, 
  PlusCircle, 
  Lock, 
  Globe, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Mic, 
  Link2, 
  Star, 
  Check, 
  Sparkles,
  Users,
  Clock,
  Download,
  Share2,
  Ban,
  Search
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';

interface ChatInfoModalProps {
  isOpen: boolean;
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onClose: () => void;
  onStartCall: (isVideo: boolean) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string }) => void;
  onOpenCommunityFeed?: (chat: Chat) => void;
  onDeleteChatHistory?: (chatId: string, forBoth: boolean) => void;
  onBlockUser?: (userId: string) => void;
  onAddUserToGroupOrChannel?: (targetChatId: string, targetType: 'group' | 'channel') => void;
  onOpenSearch?: () => void;
}

type MediaSubTab = 'media' | 'starred' | 'files' | 'music' | 'voice_gif' | 'links';

export const ChatInfoModal: React.FC<ChatInfoModalProps> = ({
  isOpen,
  chat,
  messages,
  currentUser,
  onClose,
  onStartCall,
  onOpenUserProfile,
  onOpenCommunityFeed,
  onDeleteChatHistory,
  onBlockUser,
  onAddUserToGroupOrChannel,
  onOpenSearch
}) => {
  // Navigation & Dropdown States
  const [activeMediaTab, setActiveMediaTab] = useState<MediaSubTab>('media');
  const [isCallDropdownOpen, setIsCallDropdownOpen] = useState(false);
  const [isMuteDropdownOpen, setIsMuteDropdownOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [muteText, setMuteText] = useState<string>('Уведомления включены');
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Sub-menus
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const scrollTabsRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isCommunity = chat.type === 'channel' || chat.type === 'group';

  // Filter messages for current chat media tabs
  const chatMessages = messages.filter((m) => m.chatId === chat.id || true); // fallback to list

  const mediaList = chatMessages.filter((m) => m.type === 'image' || m.type === 'video_note');
  const fileList = chatMessages.filter((m) => m.type === 'file');
  const musicList = chatMessages.filter((m) => m.type === 'audio');
  const voiceGifList = chatMessages.filter((m) => m.type === 'voice' || (m.type === 'image' && m.mediaUrl?.includes('.gif')));
  const linksList = chatMessages.filter((m) => m.content && (m.content.includes('http://') || m.content.includes('https://')));
  const starredList = chatMessages.filter((m) => m.reactions && m.reactions.length > 0);

  const handleMuteSelect = (durationText: string, isOff: boolean) => {
    playSentSound();
    setIsMuted(isOff);
    setMuteText(durationText);
    setIsMuteDropdownOpen(false);
    setActionNotice(`Уведомления: ${durationText}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleBlockClick = () => {
    playReactionSound();
    setIsBlocked(!isBlocked);
    const targetUserId = chat.members?.find((m) => m.userId !== currentUser.id)?.userId;
    if (targetUserId && onBlockUser) {
      onBlockUser(targetUserId);
    }
    setActionNotice(!isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    setIsMoreDropdownOpen(false);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleOpenProfileClick = () => {
    playReactionSound();
    if (isCommunity && onOpenCommunityFeed) {
      onOpenCommunityFeed(chat);
      onClose();
      return;
    }

    const other = chat.members?.find((m) => m.userId !== currentUser.id);
    if (other && onOpenUserProfile) {
      onOpenUserProfile({
        id: other.userId,
        name: other.displayName,
        username: other.username,
        avatar: other.avatarUrl
      });
      onClose();
    } else if (onOpenUserProfile) {
      onOpenUserProfile({
        id: 'u_durov',
        name: chat.title || 'Павел Дуров',
        username: 'durov',
        avatar: chat.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
      });
      onClose();
    } else {
      setActionNotice(isCommunity ? 'Сообщество открыто' : 'Профиль открыт');
      setTimeout(() => setActionNotice(null), 2000);
    }
    setIsMoreDropdownOpen(false);
  };

  const handleDeleteHistory = (forBoth: boolean) => {
    playSentSound();
    if (onDeleteChatHistory) {
      onDeleteChatHistory(chat.id, forBoth);
    }
    setActionNotice(forBoth ? 'Переписка удалена у обоих' : 'Переписка удалена у вас');
    setShowDeleteConfirm(false);
    setIsMoreDropdownOpen(false);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleAddToChat = (type: 'group' | 'channel') => {
    playSentSound();
    if (onAddUserToGroupOrChannel) {
      onAddUserToGroupOrChannel(chat.id, type);
    }
    setActionNotice(`Добавлено в ${type === 'group' ? 'группу' : 'канал'}`);
    setShowAddMenu(false);
    setIsMoreDropdownOpen(false);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollTabsRef.current) {
      scrollTabsRef.current.scrollBy({
        left: direction === 'left' ? -140 : 140,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in">
      <div className="bg-[#17212b] border border-[#243344] rounded-3xl w-full max-w-md h-[650px] max-h-[92vh] flex flex-col text-white shadow-2xl relative overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="p-3.5 bg-[#17212b] border-b border-[#0e1621] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#64b5f6] px-2 py-0.5 rounded-full bg-[#5288c1]/15 border border-[#5288c1]/30">
              {chat.type === 'channel' ? '📢 Канал' : chat.type === 'group' ? '👥 Группа' : '👤 Профиль'}
            </span>
            {isMuted && (
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <BellOff className="w-3 h-3" /> Без звука
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Top Quick Bell Toggle button */}
            <button
              onClick={() => {
                setIsMuteDropdownOpen(!isMuteDropdownOpen);
                setIsCallDropdownOpen(false);
                setIsMoreDropdownOpen(false);
              }}
              className={`p-2 rounded-full transition cursor-pointer ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-[#202b36] text-slate-300 hover:text-white'
              }`}
              title="Уведомления: Выставить время или выключить"
            >
              {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#202b36] hover:bg-[#283748] text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {actionNotice && (
          <div className="bg-[#5288c1] text-white text-xs font-bold py-2 px-4 text-center animate-in slide-in-from-top duration-200">
            {actionNotice}
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          
          {/* Big Avatar + Name + Subtitle Header (Clickable to open full profile) */}
          <div className="flex flex-col items-center text-center">
            <button
              onClick={handleOpenProfileClick}
              className="relative mb-3 group cursor-pointer hover:scale-105 transition transform"
              title="Нажмите, чтобы открыть профиль"
            >
              <img
                src={chat.avatarUrl}
                alt={chat.title}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#5288c1]/40 shadow-xl group-hover:ring-cyan-400 transition"
              />
              {chat.type === 'direct' && (
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#17212b] bg-emerald-500" />
              )}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#5288c1] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow opacity-90 group-hover:opacity-100 transition whitespace-nowrap">
                {isCommunity ? 'Зайти на сообщество' : 'Зайти на профиль'}
              </span>
            </button>

            <h2
              onClick={handleOpenProfileClick}
              className="font-extrabold text-lg sm:text-xl text-white flex items-center justify-center gap-1.5 cursor-pointer hover:text-cyan-300 transition"
              title="Нажмите, чтобы открыть профиль"
            >
              <span>{chat.title}</span>
              {chat.type === 'channel' && <span className="text-cyan-400 text-sm">📢</span>}
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">
              {chat.type === 'saved' ? (
                <span className="text-[#64b5f6] font-semibold">1 человек • личное хранилище</span>
              ) : chat.type === 'direct' ? (
                <span className="text-emerald-400 font-semibold">в сети</span>
              ) : (
                <span>{chat.membersCount} {chat.type === 'channel' ? 'подписчиков' : 'участников'}</span>
              )}
            </p>

            {chat.description && (
              <p className="text-xs text-slate-300 mt-2 px-4 py-1.5 rounded-xl bg-[#1e2a38] border border-[#283748] max-w-xs">
                {chat.description}
              </p>
            )}
          </div>

          {/* Primary Action Buttons Row - EXACTLY 4 BUTTONS: Вызов, Включить звук, Поиск, Ещё */}
          <div className="grid grid-cols-4 gap-2 py-2">
            
            {/* BUTTON 1: ВЫЗОВ (Видеозвонок / Обычный звонок) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsCallDropdownOpen(!isCallDropdownOpen);
                  setIsMuteDropdownOpen(false);
                  setIsMoreDropdownOpen(false);
                }}
                className="w-full py-2.5 px-1 rounded-2xl bg-[#202b36] hover:bg-[#283748] border border-[#2b3c4f] flex flex-col items-center justify-center gap-1 text-[#64b5f6] hover:text-white transition cursor-pointer shadow-md"
              >
                <Phone className="w-5 h-5" />
                <span className="text-[11px] font-bold truncate">Вызов</span>
              </button>

              {/* Dropdown Menu: Видеозвонок / Обычный звонок */}
              {isCallDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-44 bg-[#1e2a38] border border-[#2b3c4f] rounded-2xl shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsCallDropdownOpen(false);
                      onStartCall(false);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold flex items-center gap-2 text-emerald-300 transition cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Обычный звонок</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCallDropdownOpen(false);
                      onStartCall(true);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold flex items-center gap-2 text-cyan-300 transition cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span>Видеозвонок</span>
                  </button>
                </div>
              )}
            </div>

            {/* BUTTON 2: ВКЛЮЧИТЬ ЗВУК / ЗВУК (Вкл / Выкл, выставить время) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsMuteDropdownOpen(!isMuteDropdownOpen);
                  setIsCallDropdownOpen(false);
                  setIsMoreDropdownOpen(false);
                }}
                className={`w-full py-2.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-md ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-[#202b36] hover:bg-[#283748] border-[#2b3c4f] text-[#64b5f6] hover:text-white'
                }`}
              >
                {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                <span className="text-[11px] font-bold truncate">{isMuted ? 'Без звука' : 'Звук'}</span>
              </button>

              {/* Mute Time Selector Dropdown */}
              {isMuteDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-[#1e2a38] border border-[#2b3c4f] rounded-2xl shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Настройка уведомлений
                  </div>
                  <button
                    onClick={() => handleMuteSelect('Включены', false)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-emerald-300 transition cursor-pointer"
                  >
                    🔔 Включить звук
                  </button>
                  <button
                    onClick={() => handleMuteSelect('Отключены на 1 час', true)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    ⏱️ Отключить на 1 час
                  </button>
                  <button
                    onClick={() => handleMuteSelect('Отключены на 8 часов', true)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    ⏱️ Отключить на 8 часов
                  </button>
                  <button
                    onClick={() => handleMuteSelect('Отключены на 24 часа', true)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    ⏱️ Отключить на 24 часа
                  </button>
                  <button
                    onClick={() => handleMuteSelect('Отключены на 7 дней', true)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    📅 Отключить на 7 дней
                  </button>
                  <button
                    onClick={() => handleMuteSelect('Отключены навсегда', true)}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left text-xs font-semibold text-rose-300 transition cursor-pointer"
                  >
                    🔕 Отключить навсегда
                  </button>
                </div>
              )}
            </div>

            {/* BUTTON 3: ПОИСК (Поиск сообщений) */}
            <div className="relative">
              <button
                onClick={() => {
                  playReactionSound();
                  if (onOpenSearch) {
                    onOpenSearch();
                  } else {
                    setActionNotice('Режим поиска сообщений активирован');
                    setTimeout(() => setActionNotice(null), 2000);
                  }
                  onClose();
                }}
                className="w-full py-2.5 px-1 rounded-2xl bg-[#202b36] hover:bg-[#283748] border border-[#2b3c4f] flex flex-col items-center justify-center gap-1 text-[#64b5f6] hover:text-white transition cursor-pointer shadow-md"
              >
                <Search className="w-5 h-5" />
                <span className="text-[11px] font-bold truncate">Поиск</span>
              </button>
            </div>

            {/* BUTTON 4: ЕЩЁ (Зайти на профиль, Заблокировать, Добавить в..., Удалить переписку) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsMoreDropdownOpen(!isMoreDropdownOpen);
                  setIsCallDropdownOpen(false);
                  setIsMuteDropdownOpen(false);
                }}
                className="w-full py-2.5 px-1 rounded-2xl bg-[#202b36] hover:bg-[#283748] border border-[#2b3c4f] flex flex-col items-center justify-center gap-1 text-[#64b5f6] hover:text-white transition cursor-pointer shadow-md"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[11px] font-bold truncate">Ещё</span>
              </button>

              {/* Dropdown Menu for ЕЩЁ */}
              {isMoreDropdownOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-56 bg-[#1e2a38] border border-[#2b3c4f] rounded-2xl shadow-2xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 text-xs font-semibold">
                  
                  {/* 1. Зайти на профиль / Зайти на сообщество */}
                  <button
                    onClick={handleOpenProfileClick}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left flex items-center gap-2.5 text-cyan-300 hover:text-cyan-200 transition cursor-pointer font-bold bg-cyan-500/10 border border-cyan-500/20"
                  >
                    <UserIcon className="w-4 h-4 text-cyan-400" />
                    <span>{isCommunity ? 'Зайти на сообщество' : 'Зайти на профиль'}</span>
                  </button>

                  {/* 2. Заблокировать */}
                  <button
                    onClick={handleBlockClick}
                    className="w-full p-2 rounded-xl hover:bg-[#283748] text-left flex items-center gap-2.5 text-amber-300 transition cursor-pointer"
                  >
                    <Ban className="w-4 h-4 text-amber-400" />
                    <span>{isBlocked ? 'Разблокировать' : 'Заблокировать'}</span>
                  </button>

                  <div className="border-t border-[#283748] my-1" />

                  {/* 3. Добавить в Группу / Канал */}
                  <div>
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="w-full p-2 rounded-xl hover:bg-[#283748] text-left flex items-center justify-between text-slate-200 hover:text-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <PlusCircle className="w-4 h-4 text-emerald-400" />
                        <span>Добавить в...</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAddMenu ? 'rotate-90' : ''}`} />
                    </button>

                    {showAddMenu && (
                      <div className="pl-6 py-1 space-y-1 bg-[#131c26] rounded-xl my-1 border border-[#283748]">
                        <button
                          onClick={() => handleAddToChat('group')}
                          className="w-full p-1.5 hover:bg-[#202b36] rounded-lg text-left text-slate-300 hover:text-white text-[11px] transition cursor-pointer flex items-center gap-2"
                        >
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>Добавить в Группу</span>
                        </button>
                        <button
                          onClick={() => handleAddToChat('channel')}
                          className="w-full p-1.5 hover:bg-[#202b36] rounded-lg text-left text-slate-300 hover:text-white text-[11px] transition cursor-pointer flex items-center gap-2"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span>Добавить в Канал</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#283748] my-1" />

                  {/* 4. Удалить переписку (У себя / У обоих) */}
                  <div>
                    <button
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      className="w-full p-2 rounded-xl hover:bg-rose-600/20 text-left flex items-center justify-between text-rose-400 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Удалить переписку</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDeleteConfirm ? 'rotate-90' : ''}`} />
                    </button>

                    {showDeleteConfirm && (
                      <div className="p-2 bg-rose-950/40 rounded-xl my-1 border border-rose-500/30 space-y-1">
                        <button
                          onClick={() => handleDeleteHistory(false)}
                          className="w-full py-1.5 px-2 bg-rose-900/40 hover:bg-rose-800 text-rose-200 rounded-lg text-[11px] font-bold text-left transition cursor-pointer"
                        >
                          🗑️ Удалить только у себя
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(true)}
                          className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold text-left transition cursor-pointer"
                        >
                          💥 Удалить у обоих
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Horizontal Scrollable Media Filter Pills Bar (<- ->) */}
          <div className="pt-2 border-t border-[#283748]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Содержимое переписки:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => scrollTabs('left')}
                  className="p-1 rounded-lg bg-[#202b36] hover:bg-[#283748] text-slate-300 hover:text-white transition cursor-pointer"
                  title="Прокрутить влево"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollTabs('right')}
                  className="p-1 rounded-lg bg-[#202b36] hover:bg-[#283748] text-slate-300 hover:text-white transition cursor-pointer"
                  title="Прокрутить вправо"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pills Container */}
            <div 
              ref={scrollTabsRef}
              className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap text-xs select-none"
            >
              <button
                onClick={() => setActiveMediaTab('media')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'media'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Медиа ({mediaList.length})</span>
              </button>

              <button
                onClick={() => setActiveMediaTab('starred')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'starred'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span>Избранное ({starredList.length})</span>
              </button>

              <button
                onClick={() => setActiveMediaTab('files')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'files'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Файлы ({fileList.length})</span>
              </button>

              <button
                onClick={() => setActiveMediaTab('music')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'music'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Музыка ({musicList.length})</span>
              </button>

              <button
                onClick={() => setActiveMediaTab('voice_gif')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'voice_gif'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-purple-400" />
                <span>Голосовые и GIF ({voiceGifList.length})</span>
              </button>

              <button
                onClick={() => setActiveMediaTab('links')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeMediaTab === 'links'
                    ? 'bg-[#5288c1] text-white shadow'
                    : 'bg-[#1e2a38] text-slate-300 hover:bg-[#283748] border border-[#2b3c4f]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ссылки ({linksList.length})</span>
              </button>
            </div>

            {/* Media Content Display Area */}
            <div className="mt-2 min-h-36 bg-[#131c26] rounded-2xl border border-[#283748] p-3 text-xs">
              
              {/* TAB 1: MEDIA GRID */}
              {activeMediaTab === 'media' && (
                mediaList.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaList.map((m) => (
                      <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#1e2a38] border border-[#283748] group">
                        <img src={m.mediaUrl || m.content} alt="" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/60 text-[9px] text-white font-mono">
                          {m.createdAt}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
                    <span>Нет фотографий и видеозаписей</span>
                  </div>
                )
              )}

              {/* TAB 2: STARRED MESSAGES */}
              {activeMediaTab === 'starred' && (
                starredList.length > 0 ? (
                  <div className="space-y-2">
                    {starredList.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-[#1e2a38] border border-[#283748] space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-white">{m.senderName}</span>
                          <span>{m.createdAt}</span>
                        </div>
                        <p className="text-slate-200 text-xs">{m.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Star className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-amber-400" />
                    <span>Избранных сообщений пока нет</span>
                  </div>
                )
              )}

              {/* TAB 3: FILES */}
              {activeMediaTab === 'files' && (
                fileList.length > 0 ? (
                  <div className="space-y-1.5">
                    {fileList.map((m) => (
                      <div key={m.id} className="p-2 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#64b5f6] shrink-0" />
                          <span className="truncate text-slate-200 font-medium">{m.mediaMeta?.fileName || m.content}</span>
                        </div>
                        <button
                          onClick={() => downloadMediaFile(m.mediaUrl || '', m.mediaMeta?.fileName || 'document', 'image')}
                          className="p-1 rounded bg-[#5288c1] text-white hover:bg-blue-500 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-50" />
                    <span>Документы и файлы отсутствуют</span>
                  </div>
                )
              )}

              {/* TAB 4: MUSIC */}
              {activeMediaTab === 'music' && (
                musicList.length > 0 ? (
                  <div className="space-y-1.5">
                    {musicList.map((m) => (
                      <div key={m.id} className="p-2 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate text-slate-200 font-medium">{m.content}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{m.createdAt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Music className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-cyan-400" />
                    <span>Аудиофайлы не найдены</span>
                  </div>
                )
              )}

              {/* TAB 5: VOICE NOTES & GIF */}
              {activeMediaTab === 'voice_gif' && (
                voiceGifList.length > 0 ? (
                  <div className="space-y-1.5">
                    {voiceGifList.map((m) => (
                      <div key={m.id} className="p-2 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mic className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="truncate text-slate-200 font-medium">{m.content}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{m.createdAt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Mic className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-purple-400" />
                    <span>Голосовые и гифки не найдены</span>
                  </div>
                )
              )}

              {/* TAB 6: LINKS */}
              {activeMediaTab === 'links' && (
                linksList.length > 0 ? (
                  <div className="space-y-1.5">
                    {linksList.map((m) => (
                      <div key={m.id} className="p-2 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate text-[#64b5f6] font-mono text-xs underline">{m.content}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Link2 className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-emerald-400" />
                    <span>Отправленные ссылки отсутствуют</span>
                  </div>
                )
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
