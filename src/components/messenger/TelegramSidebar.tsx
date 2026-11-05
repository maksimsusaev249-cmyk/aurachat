import React, { useState } from 'react';
import { Chat, Community, Story, User } from '../../types';
import { initialContactsList } from './ContactsModal';
import { 
  Search, 
  Menu, 
  Plus, 
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
  UserPlus
} from 'lucide-react';

interface TelegramSidebarProps {
  chats: Chat[];
  selectedChatId: string;
  onSelectChat: (chat: Chat) => void;
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
  allUsers = [],
  globalCatalogChats = [],
  communities = [],
  followingUserIds = {},
  onStartDirectChatWithUser,
  onJoinGlobalChat,
  onSelectCommunity,
  onOpenUserProfile,
  onOpenGlobalSearch
}) => {
  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'channel'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const rawQuery = searchQuery.trim().toLowerCase();
  const cleanQuery = rawQuery.replace(/^@/, '');
  const isSearching = cleanQuery.length > 0;

  // Only show current user's own stories or stories of people already in user's direct chats
  const visibleStories = stories.filter((st) => {
    if (st.userId === currentUser.id) return true;
    const isInMyDirectChats = chats.some(
      (c) => c.type === 'direct' && c.members.some((m) => m.userId === st.userId)
    );
    return isInMyDirectChats || Boolean(followingUserIds[st.userId]);
  });

  // 1. Filter user's existing chats
  const filteredChats = chats.filter((c) => {
    if (!isSearching) {
      if (filter === 'direct') {
        if (c.type !== 'direct' && c.type !== 'saved') return false;
      } else if (filter !== 'all' && c.type !== filter) {
        return false;
      }
      return true;
    }

    const titleMatch = c.title.toLowerCase().includes(cleanQuery);
    const descMatch = c.description ? c.description.toLowerCase().includes(cleanQuery) : false;
    const inviteMatch = c.inviteCode ? c.inviteCode.toLowerCase().includes(cleanQuery) : false;
    const msgMatch = c.lastMessage ? c.lastMessage.toLowerCase().includes(cleanQuery) : false;
    const memberMatch = c.members.some(
      (m) =>
        m.displayName.toLowerCase().includes(cleanQuery) ||
        m.username.toLowerCase().includes(cleanQuery)
    );
    const typeKeywordMatch =
      (c.type === 'channel' && ('канал'.includes(cleanQuery) || 'каналы'.includes(cleanQuery) || 'channel'.includes(cleanQuery))) ||
      (c.type === 'group' && ('группа'.includes(cleanQuery) || 'беседа'.includes(cleanQuery) || 'беседы'.includes(cleanQuery) || 'group'.includes(cleanQuery))) ||
      (c.type === 'saved' && ('избранное'.includes(cleanQuery) || 'saved'.includes(cleanQuery)));

    return titleMatch || descMatch || inviteMatch || msgMatch || memberMatch || typeKeywordMatch;
  });

  // 2. Build deduplicated global users directory (registered accounts + contacts + chat members)
  const globalUsersDirectory = React.useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        displayName: string;
        username: string;
        avatarUrl: string;
        phone?: string;
        email?: string;
        bio?: string;
      }
    >();

    allUsers.forEach((u) => {
      if (u.id === currentUser.id) return;
      map.set(u.username.toLowerCase(), {
        userId: u.id,
        displayName: u.displayName,
        username: u.username,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        email: u.email,
        bio: u.bio
      });
    });

    initialContactsList.forEach((c) => {
      if (c.userId === currentUser.id) return;
      const key = c.username.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          userId: c.userId,
          displayName: c.displayName,
          username: c.username,
          avatarUrl: c.avatarUrl,
          phone: c.phone,
          bio: c.statusText
        });
      }
    });

    globalCatalogChats.forEach((chat) => {
      chat.members.forEach((m) => {
        if (m.userId === currentUser.id) return;
        const key = m.username.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            userId: m.userId,
            displayName: m.displayName,
            username: m.username,
            avatarUrl: m.avatarUrl,
            bio: m.customTitle
          });
        }
      });
    });

    return Array.from(map.values());
  }, [allUsers, globalCatalogChats, currentUser.id]);

  // Matched users in global search
  const matchedGlobalUsers = isSearching
    ? globalUsersDirectory.filter((u) => {
        const isGenericUserQuery =
          'пользователь'.includes(cleanQuery) ||
          'пользователи'.includes(cleanQuery) ||
          'люди'.includes(cleanQuery) ||
          'контакт'.includes(cleanQuery) ||
          'контакты'.includes(cleanQuery) ||
          'юзер'.includes(cleanQuery);

        return (
          isGenericUserQuery ||
          u.displayName.toLowerCase().includes(cleanQuery) ||
          u.username.toLowerCase().includes(cleanQuery) ||
          (u.phone && u.phone.toLowerCase().includes(cleanQuery)) ||
          (u.email && u.email.toLowerCase().includes(cleanQuery)) ||
          (u.bio && u.bio.toLowerCase().includes(cleanQuery))
        );
      })
    : [];

  // 3. Matched global channels & groups (not yet in filteredChats)
  const matchedGlobalChats = isSearching
    ? globalCatalogChats.filter((gc) => {
        if (gc.type !== 'channel' && gc.type !== 'group') return false;
        if (filteredChats.some((fc) => fc.id === gc.id)) return false;

        const isChannelQuery =
          gc.type === 'channel' &&
          ('канал'.includes(cleanQuery) || 'каналы'.includes(cleanQuery) || 'channel'.includes(cleanQuery));
        const isGroupQuery =
          gc.type === 'group' &&
          ('группа'.includes(cleanQuery) ||
            'группы'.includes(cleanQuery) ||
            'беседа'.includes(cleanQuery) ||
            'беседы'.includes(cleanQuery) ||
            'чат'.includes(cleanQuery));

        return (
          isChannelQuery ||
          isGroupQuery ||
          gc.title.toLowerCase().includes(cleanQuery) ||
          (gc.description && gc.description.toLowerCase().includes(cleanQuery)) ||
          (gc.inviteCode && gc.inviteCode.toLowerCase().includes(cleanQuery))
        );
      })
    : filter === 'channel' || filter === 'group'
    ? globalCatalogChats.filter(
        (gc) => gc.type === filter && !chats.some((c) => c.id === gc.id)
      )
    : [];

  // 4. Matched communities in global search
  const matchedCommunities = isSearching
    ? communities.filter((comm) => {
        const isCommQuery =
          'сообщество'.includes(cleanQuery) ||
          'сообщества'.includes(cleanQuery) ||
          'клуб'.includes(cleanQuery) ||
          'группа'.includes(cleanQuery) ||
          'community'.includes(cleanQuery);

        return (
          isCommQuery ||
          comm.title.toLowerCase().includes(cleanQuery) ||
          comm.description.toLowerCase().includes(cleanQuery) ||
          comm.inviteCode.toLowerCase().includes(cleanQuery) ||
          comm.ownerName.toLowerCase().includes(cleanQuery) ||
          (comm.ownerUsername && comm.ownerUsername.toLowerCase().includes(cleanQuery))
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
      isPhoneMode
        ? isMobileChatOpen
          ? 'hidden'
          : 'w-full'
        : isMobileChatOpen
        ? 'hidden md:flex md:w-72 lg:w-80 xl:w-96'
        : 'w-full md:w-72 lg:w-80 xl:w-96'
    }`}>
      {/* Top Header & Search (VKontakte Messenger Dark Mode) */}
      <div className="px-3 py-2.5 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between gap-2 w-full min-w-0">
        <button
          onClick={onOpenMainMenu || onOpenSettings}
          className="p-1.5 rounded-lg text-[#939393] hover:text-white hover:bg-[#2c2d2e] transition cursor-pointer shrink-0 flex items-center gap-1.5"
          title="Меню AuraChat (Контакты, Настройки, Смена аккаунта)"
        >
          <Menu className="w-5 h-5 text-[#71aaeb]" />
        </button>

        <div className="w-0 flex-1 min-w-0 relative flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#828282]" />
            <input
              type="text"
              placeholder="Поиск людей, сообществ, фото, видео..."
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
              className="px-2.5 py-1.5 rounded-lg bg-[#0077FF]/15 hover:bg-[#0077FF]/25 text-[#71aaeb] border border-[#0077FF]/30 text-[11px] font-semibold shrink-0 cursor-pointer transition"
              title="Глобальный поиск: люди, сообщества, каналы, посты, видео и фото"
            >
              Все
            </button>
          )}
        </div>

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
          className="relative p-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white transition flex items-center gap-1 cursor-pointer shrink-0"
          title="Создать пост, историю, новый чат или сообщество"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Tech Specs Modal Button */}
        <button
          onClick={onOpenTechSpecs}
          className={`${isPhoneMode ? 'hidden' : 'hidden sm:flex'} p-1.5 rounded-lg text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] transition items-center gap-1 cursor-pointer shrink-0`}
          title="Архитектура, SQL DDL и Бэкенд код"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Stories Tray */}
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
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1.5 py-1 min-h-0 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] space-y-2">
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

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectChat(c);
                    if (isSearching) setSearchQuery('');
                  }}
                  className={`my-0.5 px-2.5 py-2 rounded-xl cursor-pointer flex items-center gap-3 transition ${
                    isSelected
                      ? 'bg-[#2c2d2e] text-white'
                      : 'hover:bg-[#2c2d2e]/60 text-[#e1e3e6]'
                  }`}
                >
                  {/* Avatar + presence */}
                  <div className="relative shrink-0">
                    <img
                      src={c.avatarUrl}
                      alt={c.title}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {c.type === 'direct' && (
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                        isSelected ? 'border-[#2c2d2e]' : 'border-[#222222]'
                      } bg-emerald-500`} />
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
                            <Bookmark className="w-2.5 h-2.5" /> Избранное
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] shrink-0 text-[#828282]">
                        {c.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <p className={`truncate flex-1 pr-2 text-[12px] ${
                        isSelected ? 'text-[#e1e3e6]' : 'text-[#939393]'
                      }`}>
                        {c.lastMessage}
                      </p>

                      {c.unreadCount ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 min-w-5 text-center bg-[#0077FF] text-white">
                          {c.unreadCount}
                        </span>
                      ) : (
                        <CheckCheck className="w-4 h-4 shrink-0 text-[#71aaeb]" />
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
            {matchedGlobalUsers.map((u) => (
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
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#222222]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs sm:text-[13px] text-white truncate">
                        {u.displayName}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0077FF]/15 text-[#71aaeb] border border-[#0077FF]/30 shrink-0">
                        Профиль
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
            ))}
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

        {/* Empty Search State — Allow instant creation/messaging if custom @username or phone typed */}
        {isSearching && totalSearchMatches === 0 && (
          <div className="p-5 text-center space-y-3 bg-[#19191a] rounded-2xl border border-[#2e2e2e] m-2">
            <div className="text-xs font-semibold text-white">
              По запросу «{searchQuery}» точных совпадений не найдено
            </div>
            <p className="text-[11px] text-[#828282] leading-relaxed">
              Вы можете сразу написать пользователю с ником <span className="text-[#71aaeb] font-mono">@{cleanQuery}</span> или создать новый канал / беседу.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onStartDirectChatWithUser && (
                <button
                  type="button"
                  onClick={() => {
                    onStartDirectChatWithUser({
                      userId: 'usr_search_' + Date.now(),
                      displayName: searchQuery.trim().replace(/^@/, ''),
                      username: cleanQuery.replace(/\s+/g, '_'),
                      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanQuery)}&backgroundColor=1e293b`
                    });
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Написать @{cleanQuery}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};