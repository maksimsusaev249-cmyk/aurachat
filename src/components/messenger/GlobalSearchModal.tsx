import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat, Community, Post, Story, Message } from '../../types';
import { initialContactsList } from './ContactsModal';
import { isVideoMedia } from '../../utils/mediaUtils';
import { matchPhoneNumber, matchUserText, isCategoryKeywordMatch, isMockOrDemoAccount } from '../../utils/searchUtils';
import { fetchUsersFromSharedServer } from '../../firebase';
import {
  Search,
  X,
  Users,
  Layers,
  MessageSquare,
  FileText,
  Film,
  Image as ImageIcon,
  UserCheck,
  Globe,
  Lock,
  Play,
  Heart,
  Eye,
  ExternalLink,
  Sparkles,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export type SearchTab = 'all' | 'users' | 'communities' | 'chats' | 'posts' | 'videos' | 'photos';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialTab?: SearchTab;
  currentUser: User;
  allUsers: User[];
  chats: Chat[];
  userChatsMap?: Record<string, Chat[]>;
  globalCatalogChats: Chat[];
  communities: Community[];
  posts: Post[];
  reels: Post[];
  stories: Story[];
  messagesMap: Record<string, Message[]>;
  followingUserIds?: Record<string, boolean>;
  onOpenUserProfile: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    bio?: string;
    phone?: string;
    email?: string;
  }) => void;
  onStartChatWithUser: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    bio?: string;
    phone?: string;
    email?: string;
  }) => void;
  onSelectCommunity: (comm: Community) => void;
  onSelectChat: (chat: Chat) => void;
  onOpenReelsFeed: () => void;
  onOpenPostsFeed: (tab?: 'all' | 'communities') => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialTab = 'all',
  currentUser,
  allUsers,
  chats,
  userChatsMap = {},
  globalCatalogChats,
  communities,
  posts,
  reels,
  stories,
  messagesMap,
  followingUserIds = {},
  onOpenUserProfile,
  onStartChatWithUser,
  onSelectCommunity,
  onSelectChat,
  onOpenReelsFeed,
  onOpenPostsFeed
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [serverUsers, setServerUsers] = useState<User[]>([]);
  const [previewMedia, setPreviewMedia] = useState<{
    title: string;
    author: string;
    authorAvatar?: string;
    mediaUrl: string;
    isVideo: boolean;
    likesCount?: number;
    createdAt?: string;
  } | null>(null);

  // Automatic background sync with Shared Server when search opens and while typing
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setActiveTab(initialTab || 'all');
      fetchUsersFromSharedServer('').then((remoteUsers) => {
        if (Array.isArray(remoteUsers)) {
          setServerUsers(remoteUsers);
        }
      });
    }
  }, [isOpen, initialQuery, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchUsersFromSharedServer('').then((remoteUsers) => {
        if (Array.isArray(remoteUsers)) {
          setServerUsers(remoteUsers);
        }
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, query]);

  const cleanQuery = query.trim().toLowerCase().replace(/^@/, '');

  // 1. Build complete deduplicated directory of real users/profiles across platform + Shared Server
  const allProfiles = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        username: string;
        avatar: string;
        bio?: string;
        phone?: string;
        email?: string;
      }
    >();

    const registerProfile = (u: {
      id?: string;
      name?: string;
      username?: string;
      avatar?: string;
      bio?: string;
      phone?: string;
      email?: string;
    }) => {
      if (isMockOrDemoAccount(u)) return;
      const rawName = (u.name || u.username || '').trim();
      if (!rawName || rawName === 'Избранное' || rawName.startsWith('Избранное')) return;

      const digitsInName = rawName.match(/^(?:Абонент|абонент)\s*(\d{4})$/);
      const rawUsername = (u.username || '').trim().replace(/^@/, '');
      const finalUsername =
        rawUsername && rawUsername !== `abonent_${digitsInName?.[1]}`
          ? rawUsername
          : digitsInName
          ? `user_${digitsInName[1]}`
          : rawUsername || rawName.toLowerCase().replace(/\s+/g, '_');

      const key = (finalUsername || u.id || rawName).toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: u.id || `u_${key}`,
          name: rawName,
          username: finalUsername,
          avatar:
            u.avatar ||
            `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(rawName)}&backgroundColor=182533`,
          bio: u.bio || 'Пользователь Chatix',
          phone: u.phone,
          email: u.email
        });
      } else {
        map.set(key, {
          ...existing,
          phone: existing.phone || u.phone,
          email: existing.email || u.email,
          bio: existing.bio || u.bio
        });
      }
    };

    // Current user, saved accounts & Shared Server accounts
    registerProfile({
      id: currentUser.id,
      name: currentUser.displayName,
      username: currentUser.username,
      avatar: currentUser.avatarUrl,
      bio: currentUser.bio,
      phone: currentUser.phone,
      email: currentUser.email
    });

    [...allUsers, ...serverUsers].forEach((u) => {
      if (!u) return;
      registerProfile({
        id: u.id,
        name: u.displayName,
        username: u.username,
        avatar: u.avatarUrl,
        bio: u.bio,
        phone: u.phone,
        email: u.email
      });
    });

    // Real non-mock chat members
    const allKnownChats: Chat[] = [
      ...chats,
      ...globalCatalogChats,
      ...(Object.values(userChatsMap || {}).flat() as Chat[])
    ];

    allKnownChats.forEach((chat) => {
      if (!chat || !Array.isArray(chat.members)) return;
      chat.members.forEach((m) => {
        if (isMockOrDemoAccount(m)) return;
        registerProfile({
          id: m.userId,
          name: m.displayName,
          username: m.username,
          avatar: m.avatarUrl,
          bio: m.customTitle || 'Пользователь Chatix'
        });
      });
    });

    return Array.from(map.values());
  }, [currentUser, allUsers, serverUsers, chats, userChatsMap, globalCatalogChats]);

  // Filtered Users / Profiles (supports name, @username, user_XXXX / Абонент XXXX, transliteration, phone)
  const matchedUsers = useMemo(() => {
    if (!cleanQuery) return allProfiles;
    const isGenericUserQuery = isCategoryKeywordMatch(cleanQuery, [
      'люди',
      'профиль',
      'профили',
      'пользователь',
      'пользователи',
      'юзер',
      'юзеры',
      'контакт',
      'контакты'
    ]);

    return allProfiles.filter(
      (u) =>
        isGenericUserQuery ||
        matchUserText(u.name, cleanQuery) ||
        matchUserText(u.username, cleanQuery) ||
        matchUserText(u.id, cleanQuery) ||
        matchPhoneNumber(u.phone, cleanQuery) ||
        matchUserText(u.bio, cleanQuery) ||
        matchUserText(u.email, cleanQuery)
    );
  }, [allProfiles, cleanQuery]);

  // Filtered Communities (safe keyword checks + title/description/inviteCode)
  const matchedCommunities = useMemo(() => {
    if (!cleanQuery) return communities;
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

    return communities.filter(
      (c) =>
        isCommKeyword ||
        matchUserText(c.title, cleanQuery) ||
        matchUserText(c.description, cleanQuery) ||
        matchUserText(c.inviteCode, cleanQuery) ||
        matchUserText(c.ownerName, cleanQuery) ||
        (c.ownerUsername ? matchUserText(c.ownerUsername, cleanQuery) : false)
    );
  }, [communities, cleanQuery]);

  // Deduplicated Channels & Groups & Direct Chats (excluding hidden secret chats)
  const allChannelsAndGroups = useMemo(() => {
    const map = new Map<string, Chat>();
    [...chats, ...globalCatalogChats].forEach((c) => {
      if (!c || c.isSecretChat) return;
      if (c.type === 'channel' || c.type === 'group' || c.type === 'direct') {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values());
  }, [chats, globalCatalogChats]);

  const matchedChats = useMemo(() => {
    if (!cleanQuery) return allChannelsAndGroups;
    return allChannelsAndGroups.filter(
      (c) =>
        matchUserText(c.title, cleanQuery) ||
        matchUserText(c.description, cleanQuery) ||
        matchUserText(c.inviteCode, cleanQuery) ||
        matchUserText(c.lastMessage, cleanQuery) ||
        (c.members && c.members.some((m) => matchUserText(m.displayName, cleanQuery) || matchUserText(m.username, cleanQuery))) ||
        (c.type === 'channel' && 'канал'.includes(cleanQuery)) ||
        (c.type === 'group' && ('группа'.includes(cleanQuery) || 'беседа'.includes(cleanQuery)))
    );
  }, [allChannelsAndGroups, cleanQuery]);

  // Filtered Posts
  const matchedPosts = useMemo(() => {
    if (!cleanQuery) return posts;
    return posts.filter(
      (p) =>
        p.caption.toLowerCase().includes(cleanQuery) ||
        p.userName.toLowerCase().includes(cleanQuery) ||
        (p.communityTitle && p.communityTitle.toLowerCase().includes(cleanQuery)) ||
        (p.music &&
          (p.music.title.toLowerCase().includes(cleanQuery) ||
            p.music.artist.toLowerCase().includes(cleanQuery))) ||
        'пост'.includes(cleanQuery) ||
        'посты'.includes(cleanQuery) ||
        'записи'.includes(cleanQuery)
    );
  }, [posts, cleanQuery]);

  // All Videos (Reels + Video Posts + Video Stories)
  const allVideoItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      author: string;
      authorId: string;
      authorAvatar: string;
      mediaUrl: string;
      likesCount: number;
      viewsCount: number;
      createdAt: string;
      source: 'Клип' | 'Видео-пост' | 'Видео-история';
    }[] = [];

    reels.forEach((r) => {
      if (r.mediaUrl) {
        list.push({
          id: r.id,
          title: r.caption || 'Клип Chatix',
          author: r.userName,
          authorId: r.userId,
          authorAvatar: r.userAvatar,
          mediaUrl: r.mediaUrl,
          likesCount: r.likesCount,
          viewsCount: r.viewsCount || 0,
          createdAt: r.createdAt,
          source: 'Клип'
        });
      }
    });

    posts.forEach((p) => {
      if (p.mediaUrl && isVideoMedia(p.mediaUrl, p.mediaType)) {
        list.push({
          id: p.id,
          title: p.caption || 'Видеозапись',
          author: p.userName,
          authorId: p.userId,
          authorAvatar: p.userAvatar,
          mediaUrl: p.mediaUrl,
          likesCount: p.likesCount,
          viewsCount: p.viewsCount || 0,
          createdAt: p.createdAt,
          source: 'Видео-пост'
        });
      }
    });

    stories.forEach((s) => {
      if (s.mediaUrl && isVideoMedia(s.mediaUrl, s.mediaType)) {
        list.push({
          id: s.id,
          title: s.caption || 'Видео-история',
          author: s.userName,
          authorId: s.userId,
          authorAvatar: s.userAvatar,
          mediaUrl: s.mediaUrl,
          likesCount: 0,
          viewsCount: s.viewsCount,
          createdAt: s.createdAt,
          source: 'Видео-история'
        });
      }
    });

    return list;
  }, [reels, posts, stories]);

  const matchedVideos = useMemo(() => {
    if (!cleanQuery) return allVideoItems;
    return allVideoItems.filter(
      (v) =>
        v.title.toLowerCase().includes(cleanQuery) ||
        v.author.toLowerCase().includes(cleanQuery) ||
        'видео'.includes(cleanQuery) ||
        'клип'.includes(cleanQuery) ||
        'клипы'.includes(cleanQuery) ||
        'рилс'.includes(cleanQuery)
    );
  }, [allVideoItems, cleanQuery]);

  // All Photos (Image Posts + Image Stories + Chat Photos)
  const allPhotoItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      author: string;
      authorId: string;
      authorAvatar: string;
      mediaUrl: string;
      createdAt: string;
      source: 'Фото в посте' | 'История' | 'Фото в чате';
    }[] = [];

    posts.forEach((p) => {
      if (p.mediaUrl && !isVideoMedia(p.mediaUrl, p.mediaType)) {
        list.push({
          id: p.id,
          title: p.caption || 'Фотография из ленты',
          author: p.userName,
          authorId: p.userId,
          authorAvatar: p.userAvatar,
          mediaUrl: p.mediaUrl,
          createdAt: p.createdAt,
          source: 'Фото в посте'
        });
      }
    });

    stories.forEach((s) => {
      if (s.mediaUrl && !isVideoMedia(s.mediaUrl, s.mediaType)) {
        list.push({
          id: s.id,
          title: s.caption || 'Фото-история',
          author: s.userName,
          authorId: s.userId,
          authorAvatar: s.userAvatar,
          mediaUrl: s.mediaUrl,
          createdAt: s.createdAt,
          source: 'История'
        });
      }
    });

    Object.values(messagesMap).forEach((msgs) => {
      msgs.forEach((m) => {
        if (m.type === 'image' && m.mediaUrl) {
          list.push({
            id: m.id,
            title: m.content || 'Фотография из чата',
            author: m.senderName,
            authorId: m.senderId,
            authorAvatar: m.senderAvatar,
            mediaUrl: m.mediaUrl,
            createdAt: m.createdAt,
            source: 'Фото в чате'
          });
        }
      });
    });

    return list;
  }, [posts, stories, messagesMap]);

  const matchedPhotos = useMemo(() => {
    if (!cleanQuery) return allPhotoItems;
    return allPhotoItems.filter(
      (ph) =>
        ph.title.toLowerCase().includes(cleanQuery) ||
        ph.author.toLowerCase().includes(cleanQuery) ||
        'фото'.includes(cleanQuery) ||
        'фотки'.includes(cleanQuery) ||
        'фотографии'.includes(cleanQuery) ||
        'картинки'.includes(cleanQuery)
    );
  }, [allPhotoItems, cleanQuery]);

  const tabs: { id: SearchTab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'all',
      label: 'Все',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      count:
        matchedUsers.length +
        matchedCommunities.length +
        matchedChats.length +
        matchedPosts.length +
        matchedVideos.length +
        matchedPhotos.length
    },
    {
      id: 'users',
      label: 'Люди',
      icon: <Users className="w-3.5 h-3.5" />,
      count: matchedUsers.length
    },
    {
      id: 'communities',
      label: 'Сообщества',
      icon: <Layers className="w-3.5 h-3.5" />,
      count: matchedCommunities.length
    },
    {
      id: 'chats',
      label: 'Каналы и чаты',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      count: matchedChats.length
    },
    {
      id: 'posts',
      label: 'Посты',
      icon: <FileText className="w-3.5 h-3.5" />,
      count: matchedPosts.length
    },
    {
      id: 'videos',
      label: 'Видео и Клипы',
      icon: <Film className="w-3.5 h-3.5" />,
      count: matchedVideos.length
    },
    {
      id: 'photos',
      label: 'Фотографии',
      icon: <ImageIcon className="w-3.5 h-3.5" />,
      count: matchedPhotos.length
    }
  ];

  const showUsers = activeTab === 'all' || activeTab === 'users';
  const showCommunities = activeTab === 'all' || activeTab === 'communities';
  const showChats = activeTab === 'all' || activeTab === 'chats';
  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showVideos = activeTab === 'all' || activeTab === 'videos';
  const showPhotos = activeTab === 'all' || activeTab === 'photos';

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScrollVertical = (direction: 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'up' ? -420 : 420;
    scrollContainerRef.current.scrollBy({ top: offset, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-[100dvh] bg-[#141414] flex flex-col overflow-hidden select-none">
      <div className="w-full h-full bg-[#141414] flex flex-col overflow-hidden relative">
        {/* Top Full-Screen Search Header */}
        <div className="px-3 sm:px-6 py-3 bg-[#1c1c1e] border-b border-[#2e2e2e] shrink-0">
          <div className="max-w-3xl mx-auto w-full space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#71aaeb] absolute left-3.5 top-3" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск людей (@юзер), сообществ, каналов, постов, видео, фото..."
                  className="w-full bg-[#141414] text-white text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 border border-[#2e2e2e] focus:border-[#0077FF] outline-none placeholder-[#828282] transition"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-[#828282] hover:text-white cursor-pointer"
                    title="Очистить"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] hover:text-white transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Закрыть</span>
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                      isActive
                        ? 'bg-[#0077FF] text-white shadow-sm'
                        : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full-Screen Single-Column Vertical Scroll Body (В столбик вверх и вниз) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain touch-pan-y px-3 sm:px-6 py-4 scrollbar-thin"
        >
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 pb-20">
            {/* 1. ЛЮДИ И ПРОФИЛИ (В СТОЛБИК) */}
            {showUsers && matchedUsers.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71aaeb] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Люди и профили ({matchedUsers.length})</span>
                  </h3>
                  {activeTab === 'all' && matchedUsers.length > 8 && (
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-[11px] text-[#71aaeb] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Показать всех</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {matchedUsers.map((u) => {
                    const isMe = u.id === currentUser.id;
                    return (
                      <div
                        key={u.id + '_' + u.username}
                        className="w-full p-3 rounded-xl bg-[#222222] hover:bg-[#28292a] border border-[#2e2e2e] flex items-center justify-between gap-3 transition"
                      >
                        <div
                          onClick={() => {
                            onOpenUserProfile(u);
                            onClose();
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-12 h-12 rounded-full object-cover bg-[#141414] shrink-0 border border-[#0077FF]/30"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white truncate">
                                {u.name}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded bg-[#0077FF]/20 text-[#71aaeb] text-[10px] font-semibold">
                                  Вы
                                </span>
                              )}
                              {followingUserIds[u.id] && !isMe && (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[#71aaeb] truncate">@{u.username}</p>
                            {u.bio && (
                              <p className="text-xs text-[#939393] truncate mt-0.5">{u.bio}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              onOpenUserProfile(u);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-white text-xs font-semibold cursor-pointer transition"
                            title="Открыть страницу человека"
                          >
                            Профиль
                          </button>
                          {!isMe && (
                            <button
                              onClick={() => {
                                onStartChatWithUser(u);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer transition"
                              title="Написать личное сообщение"
                            >
                              Чат
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. СООБЩЕСТВА (В СТОЛБИК) */}
            {showCommunities && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Сообщества ({matchedCommunities.length})</span>
                  </h3>
                  <button
                    onClick={() => {
                      onOpenPostsFeed('communities');
                      onClose();
                    }}
                    className="text-[11px] text-[#71aaeb] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Раздел сообществ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {matchedCommunities.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {matchedCommunities.map((comm) => (
                      <div
                        key={comm.id}
                        onClick={() => {
                          onSelectCommunity(comm);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-[#222222] hover:bg-[#28292a] border border-[#2e2e2e] flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={comm.avatarUrl}
                            alt={comm.title}
                            className="w-12 h-12 rounded-xl object-cover bg-[#141414] shrink-0 border border-purple-500/30"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-white truncate">
                              {comm.title}
                            </p>
                            <p className="text-xs text-purple-400 truncate">
                              Сообщество • {comm.subscribersCount} подписчиков
                            </p>
                            <p className="text-xs text-[#939393] truncate mt-0.5">
                              {comm.description}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold shrink-0">
                          Открыть
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  activeTab === 'communities' && (
                    <div className="p-6 rounded-xl bg-[#222222] border border-[#2e2e2e] text-center space-y-2">
                      <Layers className="w-8 h-8 text-[#71aaeb] mx-auto opacity-70" />
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        Сообщества пока не созданы или не найдены
                      </p>
                      <button
                        onClick={() => {
                          onOpenPostsFeed('communities');
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer transition"
                      >
                        Перейти к созданию сообщества
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* 3. КАНАЛЫ, ГРУППЫ И ЧАТЫ (В СТОЛБИК) */}
            {showChats && matchedChats.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Каналы, группы и чаты ({matchedChats.length})</span>
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  {matchedChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        onSelectChat(chat);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-[#222222] hover:bg-[#28292a] border border-[#2e2e2e] flex items-center justify-between gap-3 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={chat.avatarUrl}
                          alt={chat.title}
                          className="w-11 h-11 rounded-full object-cover bg-[#141414] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {chat.isPrivate ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-[#71aaeb] shrink-0" />
                            )}
                            <span className="font-bold text-sm text-white truncate">
                              {chat.title}
                            </span>
                          </div>
                          <p className="text-xs text-[#939393] truncate">
                            {chat.type === 'channel'
                              ? 'Канал'
                              : chat.type === 'group'
                                ? 'Группа'
                                : 'Личный чат'}{' '}
                            • {chat.membersCount} участн.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] text-[#71aaeb] text-xs font-semibold shrink-0">
                        Перейти
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ПОСТЫ И ЗАПИСИ (В СТОЛБИК) */}
            {showPosts && matchedPosts.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Посты и записи ({matchedPosts.length})</span>
                  </h3>
                  <button
                    onClick={() => {
                      onOpenPostsFeed('all');
                      onClose();
                    }}
                    className="text-[11px] text-[#71aaeb] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Вся лента</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {matchedPosts.map((p) => {
                    const hasVideo = Boolean(p.mediaUrl && isVideoMedia(p.mediaUrl, p.mediaType));
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (p.mediaUrl) {
                            setPreviewMedia({
                              title: p.caption,
                              author: p.userName,
                              authorAvatar: p.userAvatar,
                              mediaUrl: p.mediaUrl,
                              isVideo: hasVideo,
                              likesCount: p.likesCount,
                              createdAt: p.createdAt
                            });
                          } else {
                            onOpenPostsFeed('all');
                            onClose();
                          }
                        }}
                        className="w-full p-3.5 rounded-xl bg-[#222222] hover:bg-[#28292a] border border-[#2e2e2e] flex flex-col gap-2.5 cursor-pointer transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.userAvatar}
                              alt={p.userName}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {p.userName}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#828282] shrink-0">{p.createdAt}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#e1e3e6] leading-relaxed">{p.caption}</p>

                        {p.mediaUrl && (
                          <div className="w-full max-h-80 rounded-xl overflow-hidden bg-black relative border border-[#2e2e2e]">
                            {hasVideo ? (
                              <video
                                src={p.mediaUrl}
                                className="w-full max-h-80 object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={p.mediaUrl}
                                alt={p.caption}
                                className="w-full max-h-80 object-cover"
                              />
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-[#939393]">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-rose-400" /> {p.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {p.viewsCount}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. ВИДЕО И КЛИПЫ (В СТОЛБИК) */}
            {showVideos && matchedVideos.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    <span>Видео и Клипы ({matchedVideos.length})</span>
                  </h3>
                  <button
                    onClick={() => {
                      onOpenReelsFeed();
                      onClose();
                    }}
                    className="text-[11px] text-[#71aaeb] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Открыть Клипы</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {matchedVideos.map((vid) => {
                    const isRealVid = isVideoMedia(vid.mediaUrl, 'video');
                    return (
                      <div
                        key={vid.id}
                        onClick={() =>
                          setPreviewMedia({
                            title: vid.title,
                            author: vid.author,
                            authorAvatar: vid.authorAvatar,
                            mediaUrl: vid.mediaUrl,
                            isVideo: isRealVid,
                            likesCount: vid.likesCount,
                            createdAt: vid.createdAt
                          })
                        }
                        className="w-full rounded-xl overflow-hidden bg-[#222222] border border-[#2e2e2e] flex flex-col cursor-pointer hover:border-[#0077FF]/50 transition"
                      >
                        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-[#2e2e2e]">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={vid.authorAvatar}
                              alt={vid.author}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              @{vid.author}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{vid.source}</span>
                          </span>
                        </div>

                        <div className="w-full max-h-96 bg-black relative flex items-center justify-center overflow-hidden">
                          {isRealVid ? (
                            <video
                              src={vid.mediaUrl}
                              className="w-full max-h-96 object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={vid.mediaUrl}
                              alt={vid.title}
                              className="w-full max-h-96 object-cover"
                            />
                          )}
                        </div>

                        <div className="p-3 flex items-center justify-between gap-3">
                          <p className="text-xs sm:text-sm font-semibold text-white line-clamp-2 flex-1">
                            {vid.title}
                          </p>
                          <span className="px-3 py-1.5 rounded-lg bg-[#0077FF] text-white text-xs font-semibold shrink-0">
                            Смотреть
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. ФОТОГРАФИИ (В СТОЛБИК) */}
            {showPhotos && matchedPhotos.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Фотографии ({matchedPhotos.length})</span>
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {matchedPhotos.map((ph) => (
                    <div
                      key={ph.id}
                      onClick={() =>
                        setPreviewMedia({
                          title: ph.title,
                          author: ph.author,
                          authorAvatar: ph.authorAvatar,
                          mediaUrl: ph.mediaUrl,
                          isVideo: false,
                          createdAt: ph.createdAt
                        })
                      }
                      className="w-full rounded-xl overflow-hidden bg-[#222222] border border-[#2e2e2e] flex flex-col cursor-pointer hover:border-[#0077FF]/50 transition"
                    >
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-[#2e2e2e]">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={ph.authorAvatar}
                            alt={ph.author}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {ph.author}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#939393] shrink-0">{ph.source}</span>
                      </div>

                      <div className="w-full max-h-96 bg-black flex items-center justify-center overflow-hidden">
                        <img
                          src={ph.mediaUrl}
                          alt={ph.title}
                          className="w-full max-h-96 object-cover"
                        />
                      </div>

                      <div className="p-3 flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm text-[#e1e3e6] truncate flex-1">
                          {ph.title}
                        </p>
                        <span className="text-xs text-[#71aaeb] font-semibold shrink-0">
                          Открыть фото
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state if nothing matched at all */}
            {matchedUsers.length === 0 &&
              matchedCommunities.length === 0 &&
              matchedChats.length === 0 &&
              matchedPosts.length === 0 &&
              matchedVideos.length === 0 &&
              matchedPhotos.length === 0 && (
                <div className="py-14 text-center space-y-2">
                  <Search className="w-10 h-10 text-[#828282] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-white">Ничего не найдено по запросу «{query}»</p>
                  <p className="text-xs text-[#939393]">
                    Попробуйте ввести имя человека, @username, название сообщества, канала или текст поста
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Floating Up / Down Scroll Buttons (Вверх и Вниз) */}
        <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleScrollVertical('up')}
            className="w-10 h-10 rounded-full bg-[#222222]/90 hover:bg-[#0077FF] text-white border border-[#3a3b3c] shadow-lg flex items-center justify-center cursor-pointer transition"
            title="Прокрутить вверх"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollVertical('down')}
            className="w-10 h-10 rounded-full bg-[#222222]/90 hover:bg-[#0077FF] text-white border border-[#3a3b3c] shadow-lg flex items-center justify-center cursor-pointer transition"
            title="Прокрутить вниз"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lightbox Media Preview Modal (for viewing found Videos, Clips, and Photos right inside Search) */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#1c1c1e] border border-[#2e2e2e] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
          >
            <div className="px-4 py-3 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {previewMedia.authorAvatar && (
                  <img
                    src={previewMedia.authorAvatar}
                    alt={previewMedia.author}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {previewMedia.author}
                  </p>
                  {previewMedia.createdAt && (
                    <p className="text-[10px] text-[#939393]">{previewMedia.createdAt}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black flex-1 min-h-0 flex items-center justify-center overflow-hidden">
              {previewMedia.isVideo ? (
                <video
                  src={previewMedia.mediaUrl}
                  className="max-h-[65dvh] w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={previewMedia.mediaUrl}
                  alt={previewMedia.title}
                  className="max-h-[65dvh] w-full object-contain"
                />
              )}
            </div>

            <div className="p-3.5 bg-[#222222] border-t border-[#2e2e2e] flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-[#e1e3e6] line-clamp-2 flex-1">
                {previewMedia.title}
              </p>
              {previewMedia.isVideo && (
                <button
                  onClick={() => {
                    setPreviewMedia(null);
                    onOpenReelsFeed();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>В ленту клипов</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
