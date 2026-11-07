import React, { useState } from 'react';
import { Chat, Community, Story, User } from '../../types';
import { initialContactsList } from './ContactsModal';
import { formatSmartTime } from '../../utils/dateUtils';
import { 
  matchPhoneNumber, 
  matchUserText, 
  isCategoryKeywordMatch, 
  getUnifiedGlobalUsersDirectory, 
  DirectoryUser 
} from '../../utils/searchUtils';
import { 
  Search, 
  Menu, 
  Plus, 
  Check,
  CheckCheck, 
  Camera, 
  FileText,
  Phone,
  Settings,
  Bookmark,
  X,
  Users,
  Layers,
  Globe,
  Lock,
  MessageSquare,
  UserPlus,
  BookOpen,
  Smartphone
} from 'lucide-react';

interface TelegramSidebarProps {
  chats: Chat[];
  selectedChatId: string;
  onSelectChat: (chat: Chat) => void;
  messagesMap?: Record<string, any[]>;
  onlinePeerMap?: Record<string, number>;
  isMobileChatOpen?: boolean;
  stories: Story[];
  onOpenStory: (story: Story) => void;
  onAddStory: () => void;
  currentUser: User;
  onOpenSettings: () => void;
  onOpenTechSpecs: () => void;
  onOpenStudio?: () => void;
  onOpenCreateChat?: () => void;
  missedCallsCount?: number;
  onOpenCallsModal?: () => void;
  onOpenMainMenu?: () => void;
  onOpenQRScanner?: () => void;
  onOpenPlusMenu?: () => void;
  isPhoneMode?: boolean;
  onTogglePhoneMode?: () => void;
  deviceViewMode?: 'auto' | 'duo' | 'folded';
  onCycleDeviceMode?: () => void;
  allUsers?: User[];
  globalCatalogChats?: Chat[];
  communities?: Community[];
  followingUserIds?: Record<string, boolean>;
  onStartDirectChatWithUser?: (target: {
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    phone?: string;
  }) => void;
  onJoinGlobalChat?: (chat: Chat) => void;
  onSelectCommunity?: (comm: Community) => void;
  isSimpleMode?: boolean;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    bio?: string;
    phone?: string;
    email?: string;
  }) => void;
  onOpenGlobalSearch?: (initialQuery?: string) => void;
}

export const TelegramSidebar: React.FC<TelegramSidebarProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  messagesMap = {},
  onlinePeerMap = {},
  isMobileChatOpen = false,
  stories,
  onOpenStory,
  onAddStory,
  currentUser,
  onOpenSettings,
  onOpenTechSpecs,
  onOpenStudio,
  missedCallsCount = 0,
  onOpenCallsModal,
  onOpenMainMenu,
  onOpenPlusMenu,
  isPhoneMode = false,
  deviceViewMode = 'auto',
  onCycleDeviceMode,
  allUsers = [],
  globalCatalogChats = [],
  communities = [],
  followingUserIds = {},
  onStartDirectChatWithUser,
  onJoinGlobalChat,
  onSelectCommunity,
  isSimpleMode = false,
  onOpenUserProfile,
  onOpenGlobalSearch
}) => {
  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'channel'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const rawQuery = searchQuery.trim().toLowerCase();
  const cleanQuery = rawQuery.replace(/^@/, '');
  const isSearching = cleanQuery.length > 0;

  // Only show current user's own stories or stories of people already in user's direct chats
  const visibleStories = stories.filter((st) => {
    if (st.userId === currentUser.id) return true;
    const isInMyDirectChats = chats.some(
      (c) => c.type === 'direct' && !c.isSecretChat && c.members.some((m) => m.userId === st.userId)
    );
    return isInMyDirectChats || Boolean(followingUserIds[st.userId]);
  });

  // 1. Build unified deduplicated global users directory across platform & contacts
  const globalUsersDirectory = React.useMemo(() => {
    return getUnifiedGlobalUsersDirectory(allUsers, currentUser.id, chats, globalCatalogChats, communities);
  }, [allUsers, currentUser.id, chats, globalCatalogChats, communities]);

  // Phone lookup map for chats and members
  const phoneLookupMap = React.useMemo(() => {
    const map = new Map<string, string>();
    globalUsersDirectory.forEach((u) => {
      if (u.phone) {
        if (u.userId) map.set(u.userId.toLowerCase(), u.phone);
        if (u.username) map.set(u.username.toLowerCase(), u.phone);
        if (u.displayName) map.set(u.displayName.toLowerCase(), u.phone);
      }
    });
    return map;
  }, [globalUsersDirectory]);

  // 2. Filter user's existing chats (Secret chats are HIDDEN from the normal list and only revealed if user enters the exact 6-digit PIN in search!)
  const filteredChats = chats.filter((c) => {
    if (c.isSecretChat) {
      if (isSearching && c.secretPin && cleanQuery === c.secretPin.toLowerCase()) {
        return true;
      }
      return false;
    }

    if (!isSearching) {
      if (filter === 'direct') {
        if (c.type !== 'direct' && c.type !== 'saved') return false;
      } else if (filter !== 'all' && c.type !== filter) {
        return false;
      }
      return true;
    }

    const titleMatch = matchUserText(c.title, cleanQuery);
    const descMatch = c.description ? matchUserText(c.description, cleanQuery) : false;
    const inviteMatch = c.inviteCode ? matchUserText(c.inviteCode, cleanQuery) : false;
    const msgMatch = c.lastMessage ? matchUserText(c.lastMessage, cleanQuery) : false;

    // Check members for name, username, OR phone number
    const memberMatch = c.members.some((m) => {
      const nameOrUserMatch = matchUserText(m.displayName, cleanQuery) || matchUserText(m.username, cleanQuery);
      const mPhone = phoneLookupMap.get(m.userId.toLowerCase()) || phoneLookupMap.get(m.username.toLowerCase()) || phoneLookupMap.get(m.displayName.toLowerCase());
      const phoneMatch = matchPhoneNumber(mPhone, cleanQuery);
      return nameOrUserMatch || phoneMatch;
    });

    // For direct chats: check peer phone directly
    const directPeer = c.type === 'direct' ? c.members.find((m) => m.userId !== currentUser.id) : null;
    const directPhone = directPeer
      ? phoneLookupMap.get(directPeer.userId.toLowerCase()) || phoneLookupMap.get(directPeer.username.toLowerCase()) || phoneLookupMap.get(c.title.toLowerCase())
      : undefined;
    const directPhoneMatch = matchPhoneNumber(directPhone, cleanQuery);

    // Safe category keyword matches (never match single letters!)
    const typeKeywordMatch =
      (c.type === 'channel' && isCategoryKeywordMatch(cleanQuery, ['канал', 'каналы', 'channel', 'channels'])) ||
      (c.type === 'group' && isCategoryKeywordMatch(cleanQuery, ['группа', 'группы', 'беседа', 'беседы', 'group', 'groups'])) ||
      (c.type === 'saved' && isCategoryKeywordMatch(cleanQuery, ['избранное', 'saved', 'заметки', 'хранилище']));

    return titleMatch || descMatch || inviteMatch || msgMatch || memberMatch || directPhoneMatch || typeKeywordMatch;
  });

  // 3. Matched users in global search (searches displayName, @username, and phone numbers in any format)
  const matchedGlobalUsers = isSearching
    ? globalUsersDirectory.filter((u) => {
        const isGenericUserQuery = isCategoryKeywordMatch(cleanQuery, [
          'пользователь',
          'пользователи',
          'люди',
          'контакт',
          'контакты',
          'юзер',
          'юзеры'
        ]);

        const nameMatch = matchUserText(u.displayName, cleanQuery);
        const userMatch = matchUserText(u.username, cleanQuery);
        const phoneMatch = matchPhoneNumber(u.phone, cleanQuery);
        const emailMatch = matchUserText(u.email, cleanQuery);
        const bioMatch = matchUserText(u.bio, cleanQuery);

        return isGenericUserQuery || nameMatch || userMatch || phoneMatch || emailMatch || bioMatch;
      })
    : [];

  // 4. Matched global channels & groups (not yet in filteredChats)
  const matchedGlobalChats = isSearching
    ? globalCatalogChats.filter((gc) => {
        if (gc.type !== 'channel' && gc.type !== 'group') return false;
        if (filteredChats.some((fc) => fc.id === gc.id)) return false;

        const isChannelKeyword =
          gc.type === 'channel' &&
          isCategoryKeywordMatch(cleanQuery, ['канал', 'каналы', 'channel', 'channels']);
        const isGroupKeyword =
          gc.type === 'group' &&
          isCategoryKeywordMatch(cleanQuery, ['группа', 'группы', 'беседа', 'беседы', 'group', 'groups']);

        return (
          isChannelKeyword ||
          isGroupKeyword ||
          matchUserText(gc.title, cleanQuery) ||
          (gc.description ? matchUserText(gc.description, cleanQuery) : false) ||
          (gc.inviteCode ? matchUserText(gc.inviteCode, cleanQuery) : false)
        );
      })
    : filter === 'channel' || filter === 'group'
    ? globalCatalogChats.filter(
        (gc) => gc.type === filter && !chats.some((c) => c.id === gc.id)
      )
    : [];

  // 5. Matched communities in global search (safe keyword checks + title/description/inviteCode)
  const matchedCommunities = isSearching
    ? communities.filter((comm) => {
        const isCommKeyword = isCategoryKeywordMatch(cleanQuery, [
          'сообщество',
          'сообщества',
          'паблик',
          'паблики',
          'клуб',
          'клубы',
          'community',
          'communities'
        ]);

        return (
          isCommKeyword ||
          matchUserText(comm.title, cleanQuery) ||
          matchUserText(comm.description, cleanQuery) ||
          matchUserText(comm.inviteCode, cleanQuery) ||
          matchUserText(comm.ownerName, cleanQuery) ||
          (comm.ownerUsername ? matchUserText(comm.ownerUsername, cleanQuery) : false)
        );
      })
    : [];

  const totalSearchMatches =
    filteredChats.length +
    matchedGlobalUsers.length +
    matchedGlobalChats.length +
    matchedCommunities.length;

  return (
    <div className={`h-full flex flex-col bg-[#222222] border-r border-[#2e2e2e] select-none text-[#e1e3e6] shrink-0 min-h-0 min-w-0 max-w-full overflow-hidden relative ${
      deviceViewMode === 'duo'
        ? 'w-full'
        : deviceViewMode === 'folded' || isPhoneMode
        ? isMobileChatOpen
          ? 'hidden'
          : 'w-full'
        : isMobileChatOpen
        ? 'hidden min-[620px]:flex min-[620px]:w-[44%] md:w-72 lg:w-80 xl:w-96'
        : 'w-full min-[620px]:w-[44%] md:w-72 lg:w-80 xl:w-96'
    }`}>
      {/* Top Header & Search (VKontakte & Telegram Clean Mobile/Desktop/Foldable Header) */}
      <div className="px-3 pt-2.5 pb-2.5 bg-[#222222] border-b border-[#2e2e2e] flex flex-col gap-2 w-full min-w-0 shrink-0">
        {/* Row 1: Menu, Title & Action Buttons */}
        <div className="flex items-center justify-between gap-1.5 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={onOpenMainMenu || onOpenSettings}
              className="p-1.5 -ml-1 rounded-lg text-[#939393] hover:text-white hover:bg-[#2c2d2e] transition cursor-pointer shrink-0 flex items-center justify-center"
              title="Меню AuraChat (Контакты, Настройки, Смена аккаунта)"
            >
              <Menu className="w-5 h-5 text-[#71aaeb]" />
            </button>
            <h2 className="font-bold text-base text-white tracking-tight truncate flex items-center gap-2">
              <span>Чаты</span>
              {isSimpleMode && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-amber-400/90 text-[11px] font-normal hover:underline cursor-pointer transition shrink-0"
                  title="Активен Простой режим (нажмите, чтобы открыть настройки)"
                >
                  <span>⚡ простой</span>
                </button>
              )}
            </h2>
          </div>

          {/* Action icons: Foldable Duo Switcher, Calls, Settings, Plus, Tech Specs */}
          <div className="flex items-center gap-1 shrink-0">
            {/* iPhone Duo / Foldable Book Mode Switcher */}
            {onCycleDeviceMode && (
              <button
                onClick={onCycleDeviceMode}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0 border ${
                  deviceViewMode === 'duo'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : deviceViewMode === 'folded'
                    ? 'bg-[#0077FF]/20 text-[#71aaeb] border-[#0077FF]/40'
                    : 'bg-[#2c2d2e] text-[#939393] hover:text-white border-transparent'
                }`}
                title="Переключить режим экрана: Авто / Раскладушка (Книжка iPhone Duo) / Сложенный телефон"
              >
                {deviceViewMode === 'duo' ? (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Книжка Duo</span>
                  </>
                ) : deviceViewMode === 'folded' ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-[#71aaeb]" />
                    <span>1 экран</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-[#71aaeb]" />
                    <span className="hidden xs:inline">Duo</span>
                  </>
                )}
              </button>
            )}

            {/* Phone Call History Button */}
            {onOpenCallsModal && (
              <button
                onClick={onOpenCallsModal}
                className={`relative p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                  missedCallsCount > 0
                    ? 'text-rose-400 bg-rose-500/20 border border-rose-500/40'
                    : 'text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e]'
                }`}
                title={missedCallsCount > 0 ? `Пропущенные звонки (${missedCallsCount})` : 'История звонков'}
              >
                <Phone className="w-4 h-4" />
                {missedCallsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[8px] font-bold flex items-center justify-center shadow-xs">
                    {missedCallsCount}
                  </span>
                )}
              </button>
            )}

            {/* Quick Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-[#939393] hover:text-white hover:bg-[#2c2d2e] transition cursor-pointer shrink-0"
              title="Настройки, смена аккаунта, выход и удаление аккаунта"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Combined Plus Action Menu Button */}
            <button
              onClick={onOpenPlusMenu || onOpenStudio || onAddStory}
              className="p-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white transition flex items-center justify-center cursor-pointer shrink-0 shadow-xs"
              title={isSimpleMode ? "Создать группу или канал" : "Создать пост, историю, новый чат или сообщество"}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Tech Specs Modal Button (Hidden in Simple Mode) */}
            {!isSimpleMode && (
              <button
                onClick={onOpenTechSpecs}
                className={`${isPhoneMode || deviceViewMode !== 'auto' ? 'hidden' : 'hidden sm:flex'} p-1.5 rounded-lg text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] transition items-center gap-1 cursor-pointer shrink-0`}
                title="Архитектура, SQL DDL и Бэкенд код"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Full-width Search Bar with Global Search Button */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#828282]" />
            <input
              type="text"
              placeholder={isPhoneMode || deviceViewMode !== 'auto' ? "Поиск людей, чатов или PIN..." : "Поиск людей, сообществ, сообщений или PIN..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2c2d2e] text-white text-xs rounded-lg pl-8 pr-7 py-1.5 outline-none placeholder-[#828282] border border-transparent focus:border-[#0077FF] focus:bg-[#19191a] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#828282] hover:text-white cursor-pointer"
                title="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {onOpenGlobalSearch && (
            <button
              type="button"
              onClick={() => onOpenGlobalSearch(searchQuery)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0077FF]/15 hover:bg-[#0077FF]/25 text-[#71aaeb] border border-[#0077FF]/30 text-[11px] font-semibold shrink-0 cursor-pointer transition whitespace-nowrap"
              title="Глобальный поиск: люди, сообщества, каналы, посты, видео и фото"
            >
              Все
            </button>
          )}
        </div>
      </div>

      {/* Stories Tray — Hidden in Simple Mode */}
      {!isSimpleMode && (
        <div className="px-3 py-2.5 bg-[#222222] border-b border-[#2e2e2e]">
          <div className="flex items-center justify-between mb-2 text-[11px] text-[#828282] font-medium">
            <span className="flex items-center gap-1.5 text-[#e1e3e6] font-semibold">
              Истории
            </span>
            <button
              onClick={onOpenStudio || onAddStory}
              className="text-[11px] text-[#71aaeb] hover:underline flex items-center gap-1 transition cursor-pointer font-medium"
            >
              <Camera className="w-3 h-3" /> Создать историю
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            <div
              onClick={onOpenStudio || onAddStory}
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#0077FF] p-0.5 flex items-center justify-center bg-[#2c2d2e] hover:bg-[#363738] transition">
                <Plus className="w-5 h-5 text-[#0077FF]" />
              </div>
              <span className="text-[10px] text-[#939393] truncate max-w-[56px]">История</span>
            </div>

            {visibleStories.map((st) => (
              <div
                key={st.id}
                onClick={() => onOpenStory(st)}
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
              >
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#0077FF] to-[#71aaeb]">
                  <div className="p-0.5 rounded-full bg-[#222222]">
                    <img
                      src={st.userAvatar}
                      alt={st.userName}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-[#e1e3e6] truncate max-w-[58px]">
                  {st.userId === currentUser.id ? 'Моя' : st.userName.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folders Navigation Bar (VK Messenger Tabs) */}
      <div className="flex items-center px-2 border-b border-[#2e2e2e] bg-[#222222] text-xs font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2.5 border-b-2 transition shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'border-[#0077FF] text-white font-semibold'
              : 'border-transparent text-[#828282] hover:text-[#e1e3e6]'
          }`}
        >
          Все чаты
        </button>
        <button
          onClick={() => setFilter('direct')}
          className={`px-3.5 py-2.5 border-b-2 transition shrink-0 cursor-pointer ${
            filter === 'direct'
              ? 'border-[#0077FF] text-white font-semibold'
              : 'border-transparent text-[#828282] hover:text-[#e1e3e6]'
          }`}
        >
          Личные
        </button>
        <button
          onClick={() => setFilter('group')}
          className={`px-3.5 py-2.5 border-b-2 transition shrink-0 cursor-pointer ${
            filter === 'group'
              ? 'border-[#0077FF] text-white font-semibold'
              : 'border-transparent text-[#828282] hover:text-[#e1e3e6]'
          }`}
        >
          Беседы
        </button>
        <button
          onClick={() => setFilter('channel')}
          className={`px-3.5 py-2.5 border-b-2 transition shrink-0 cursor-pointer ${
            filter === 'channel'
              ? 'border-[#0077FF] text-white font-semibold'
              : 'border-transparent text-[#828282] hover:text-[#e1e3e6]'
          }`}
        >
          Каналы
        </button>
      </div>

      {/* Chats & Global Search Results List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-1.5 py-1 min-h-0 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] overscroll-contain space-y-2">
        {/* SECTION 1: User's Existing Chats */}
        {filteredChats.length > 0 && (
          <div>
            {isSearching && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#828282]">
                Ваши диалоги и чаты ({filteredChats.length})
              </div>
            )}
            {filteredChats.map((c) => {
              const isSelected = c.id === selectedChatId;
              const chatMsgs = messagesMap[c.id] || [];
              const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;
              const lastMyMsg = [...chatMsgs].reverse().find((m) => m.senderId === currentUser.id);
              const peerMember = c.members?.find((m) => m.userId !== currentUser.id) || c.members?.[0];
              const matchedAcc = allUsers.find(
                (acc) =>
                  acc.id !== currentUser.id &&
                  ((peerMember && (acc.id === peerMember.userId || acc.username.toLowerCase() === peerMember.username.toLowerCase())) ||
                    acc.displayName.toLowerCase() === c.title.toLowerCase())
              );
              const isPeerOnline =
                c.type === 'direct' &&
                (matchedAcc
                  ? Boolean(!matchedAcc.hideOnlineStatus && matchedAcc.isOnline && (matchedAcc.lastSeen || 'в сети') === 'в сети')
                  : Boolean(
                      (onlinePeerMap[c.id] && Date.now() - onlinePeerMap[c.id] < 120000) ||
                        (lastMyMsg && lastMyMsg.status === 'read')
                    ));
              const effectiveUnreadCount = isSelected || c.type === 'saved' ? 0 : (c.unreadCount || 0);
              const isLastMsgRead = c.type === 'saved' || !lastMsg || lastMsg.status === 'read';

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectChat({ ...c, unreadCount: 0 });
                    if (isSearching) setSearchQuery('');
                  }}
                  className={`my-0.5 px-2.5 py-2 rounded-xl cursor-pointer flex items-center gap-3 transition ${
                    isSelected
                      ? 'bg-[#2c2d2e] text-white'
                      : 'hover:bg-[#2c2d2e]/60 text-[#e1e3e6]'
                  }`}
                >
                  {/* Avatar + realistic presence */}
                  <div className="relative shrink-0">
                    <img
                      src={c.avatarUrl}
                      alt={c.title}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {c.type === 'direct' && isPeerOnline && (
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                        isSelected ? 'border-[#2c2d2e]' : 'border-[#222222]'
                      } bg-emerald-500`} title="В сети" />
                    )}
                  </div>

                  {/* Chat details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-semibold text-xs sm:text-[13px] text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{c.title}</span>
                        {c.type === 'channel' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-medium text-[#71aaeb] bg-[#0077FF]/15 border border-[#0077FF]/30 shrink-0">
                            Канал
                          </span>
                        )}
                        {c.type === 'group' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                            Беседа
                          </span>
                        )}
                        {c.type === 'saved' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5 text-[#71aaeb] bg-[#0077FF]/15 shrink-0">
                            <Bookmark className="w-2.5 h-2.5" /> Хранилище (1 чел.)
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] shrink-0 text-[#828282]">
                        {formatSmartTime(lastMsg?.createdAt || c.lastMessageTime, lastMsg?.id || c.id, nowTick)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <p className={`truncate flex-1 pr-2 text-[12px] ${
                        isSelected ? 'text-[#e1e3e6]' : 'text-[#939393]'
                      }`}>
                        {c.lastMessage}
                      </p>

                      {effectiveUnreadCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 min-w-5 text-center bg-[#0077FF] text-white">
                          {effectiveUnreadCount}
                        </span>
                      ) : isLastMsgRead ? (
                        <span title="Прочитано (2 галочки)">
                          <CheckCheck className="w-4 h-4 shrink-0 text-[#71aaeb]" />
                        </span>
                      ) : (
                        <span title="Отправлено, ещё не прочитано (1 галочка)">
                          <Check className="w-4 h-4 shrink-0 text-[#939393]" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 2: Global Users & Contacts Search Results */}
        {isSearching && matchedGlobalUsers.length > 0 && (
          <div className="pt-1 border-t border-[#2e2e2e]/80">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#71aaeb] flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>Пользователи и контакты ({matchedGlobalUsers.length})</span>
            </div>
            {matchedGlobalUsers.map((u) => {
              const matchedAcc = allUsers.find(
                (acc) => acc.id === u.userId || acc.username.toLowerCase() === u.username.toLowerCase()
              );
              const isUserOnline = matchedAcc
                ? Boolean(!matchedAcc.hideOnlineStatus && matchedAcc.isOnline && (matchedAcc.lastSeen || 'в сети') === 'в сети')
                : false;
              const userStatusLabel = matchedAcc
                ? matchedAcc.hideOnlineStatus
                  ? 'был(а) в сети недавно'
                  : matchedAcc.lastSeen || (matchedAcc.isOnline ? 'в сети' : 'был(а) в сети недавно')
                : 'был(а) в сети недавно';

              return (
              <div
                key={u.userId + '_' + u.username}
                onClick={() => {
                  if (onOpenUserProfile) {
                    onOpenUserProfile({
                      id: u.userId,
                      name: u.displayName,
                      username: u.username,
                      avatar: u.avatarUrl,
                      bio: u.bio,
                      phone: u.phone,
                      email: u.email
                    });
                  } else {
                    onStartDirectChatWithUser?.(u);
                  }
                  setSearchQuery('');
                }}
                className="my-0.5 px-2.5 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-2 hover:bg-[#2c2d2e]/80 transition text-[#e1e3e6]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-[#3a3b3c]"
                    />
                    {isUserOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#222222]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-[13px] text-white truncate">
                        {u.displayName}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded shrink-0 ${
                        isUserOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#0077FF]/15 text-[#71aaeb] border border-[#0077FF]/30'
                      }`}>
                        {userStatusLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#939393] truncate flex items-center gap-2">
                      <span className="text-[#71aaeb] font-mono">@{u.username}</span>
                      {u.phone && <span>• {u.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onOpenUserProfile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUserProfile({
                          id: u.userId,
                          name: u.displayName,
                          username: u.username,
                          avatar: u.avatarUrl,
                          bio: u.bio,
                          phone: u.phone,
                          email: u.email
                        });
                        setSearchQuery('');
                      }}
                      className="px-2 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Профиль
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartDirectChatWithUser?.(u);
                      setSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Чат</span>
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* SECTION 3: Global Channels & Groups Search Results (or Folder Catalog) */}
        {matchedGlobalChats.length > 0 && (
          <div className="pt-1 border-t border-[#2e2e2e]/80">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              <span>
                {isSearching
                  ? `Глобальный поиск: Каналы и беседы (${matchedGlobalChats.length})`
                  : filter === 'channel'
                  ? `Доступные каналы (${matchedGlobalChats.length})`
                  : `Доступные беседы (${matchedGlobalChats.length})`}
              </span>
            </div>
            {matchedGlobalChats.map((gc) => (
              <div
                key={gc.id}
                onClick={() => {
                  if (onJoinGlobalChat) {
                    onJoinGlobalChat(gc);
                  } else {
                    onSelectChat(gc);
                  }
                  if (isSearching) setSearchQuery('');
                }}
                className="my-0.5 px-2.5 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-3 hover:bg-[#2c2d2e]/80 transition text-[#e1e3e6]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={gc.avatarUrl}
                    alt={gc.title}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#3a3b3c]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-[13px] text-white truncate">
                        {gc.title}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                          gc.type === 'channel'
                            ? 'text-[#71aaeb] bg-[#0077FF]/15 border border-[#0077FF]/30'
                            : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                        }`}
                      >
                        {gc.type === 'channel' ? 'Канал' : 'Беседа'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#939393] truncate">
                      {gc.inviteCode ? `@${gc.inviteCode} • ` : ''}
                      {gc.membersCount} участник(ов)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onJoinGlobalChat) {
                      onJoinGlobalChat(gc);
                    } else {
                      onSelectChat(gc);
                    }
                    if (isSearching) setSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-[#71aaeb] hover:text-white text-[11px] font-semibold shrink-0 transition cursor-pointer"
                >
                  Открыть
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 4: Global Communities Search Results */}
        {isSearching && matchedCommunities.length > 0 && (
          <div className="pt-1 border-t border-[#2e2e2e]/80">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              <span>Сообщества и клубы ({matchedCommunities.length})</span>
            </div>
            {matchedCommunities.map((comm) => (
              <div
                key={comm.id}
                onClick={() => {
                  onSelectCommunity?.(comm);
                  setSearchQuery('');
                }}
                className="my-0.5 px-2.5 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-3 hover:bg-[#2c2d2e]/80 transition text-[#e1e3e6]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={comm.avatarUrl}
                    alt={comm.title}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#3a3b3c]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-[13px] text-white truncate">
                        {comm.title}
                      </span>
                      {comm.isPrivate ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                          <Lock className="w-2.5 h-2.5" /> Закрытое
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0077FF]/15 text-[#71aaeb] border border-[#0077FF]/30 shrink-0">
                          Сообщество
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#939393] truncate">
                      @{comm.inviteCode} • Владелец: {comm.ownerName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCommunity?.(comm);
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-[#71aaeb] hover:text-white text-[11px] font-semibold shrink-0 transition cursor-pointer"
                >
                  Перейти
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty Search State — Честное состояние поиска (никаких фантомных диалогов) */}
        {isSearching && totalSearchMatches === 0 && (
          <div className="p-5 text-center space-y-3 bg-[#19191a] rounded-2xl border border-[#2e2e2e] m-2">
            <div className="w-11 h-11 rounded-full bg-[#252526] border border-[#333334] text-[#71aaeb] flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-semibold text-white">
                По запросу «{searchQuery}» ничего не найдено
              </div>
              <p className="text-[11px] text-[#828282] leading-relaxed max-w-xs mx-auto">
                Пользователь, диалог или сообщество с таким именем, ником или номером телефона не найдены.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] cursor-pointer transition"
              >
                Очистить поиск
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};