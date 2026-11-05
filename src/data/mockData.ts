import { User, Chat, Post, Story } from '../types';

export const currentUserMock: User = {
  id: 'usr_me_777',
  phone: '+7 (999) 000-11-22',
  email: 'architect@aurachat.internal',
  username: 'tech_lead',
  displayName: 'Максим (Tech Lead)',
  avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
  bio: 'Fullstack Architect & Systems Designer. Building next-gen real-time platforms.',
  isPrivate: false,
  hideContacts: false,
  hideOnlineStatus: false,
  isOnline: true,
  lastSeen: 'В сети'
};

export const mockStories: Story[] = [
  {
    id: 'story_1',
    userId: 'usr_pavel',
    userName: 'Павел',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Запустили серверный кластер для кружочков и WebRTC 🚀',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
    viewsCount: 1420
  },
  {
    id: 'story_2',
    userId: 'usr_elena',
    userName: 'Елена (Product)',
    userAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
    mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Новый UI сторис и рилсов принят на демо!',
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 3600 * 1000).toISOString(),
    viewsCount: 890
  },
  {
    id: 'story_3',
    userId: 'usr_alex',
    userName: 'Алексей (DevOps)',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
    mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Latency в WebSockets упал до 12ms благодаря Redis Streams',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    viewsCount: 654
  }
];

export const mockChats: Chat[] = [
  {
    id: 'chat_core_team',
    type: 'group',
    title: '🚀 Core Engineering Hub',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoreEngineering&backgroundColor=0284c7',
    isPrivate: true,
    inviteCode: 'core-eng-join',
    membersCount: 18,
    lastMessage: 'Пайплайн HLS транскодирования видео протестирован.',
    lastMessageTime: '10:42',
    unreadCount: 2,
    topics: [
      { id: 'top_general', chatId: 'chat_core_team', title: 'Общий топик', icon: '💬', unreadCount: 0 },
      { id: 'top_webrtc', chatId: 'chat_core_team', title: 'WebRTC & Звонки', icon: '📞', unreadCount: 2 },
      { id: 'top_db', chatId: 'chat_core_team', title: 'DDL & Индексы Postgres', icon: '🗄️', unreadCount: 0 }
    ],
    members: [
      { userId: 'usr_me_777', displayName: 'Максим (Tech Lead)', username: 'tech_lead', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'owner', customTitle: 'Владелец' },
      { userId: 'usr_alex', displayName: 'Алексей (DevOps)', username: 'alex_ops', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b', role: 'admin', customTitle: 'DevOps Lead' },
      { userId: 'usr_elena', displayName: 'Елена (Product)', username: 'elena_pm', avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95', role: 'member' }
    ]
  },
  {
    id: 'chat_channel_news',
    type: 'channel',
    title: '📢 AuraChat Platform Updates',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AuraChatChannel&backgroundColor=2563eb',
    isPrivate: false,
    inviteCode: 'aurachat_channel',
    membersCount: 45200,
    lastMessage: 'Выпущен релиз v1.2: Поддержка кружочков 60 FPS и приватные ветки',
    lastMessageTime: '09:15',
    unreadCount: 0,
    members: [
      { userId: 'usr_me_777', displayName: 'Максим (Tech Lead)', username: 'tech_lead', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'owner', customTitle: 'Creator' }
    ]
  },
  {
    id: 'chat_direct_pavel',
    type: 'direct',
    title: 'Павел Дуров',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    isPrivate: true,
    membersCount: 2,
    lastMessage: 'Архитектура с Redis Pub/Sub и партиционированием выглядит превосходно.',
    lastMessageTime: '08:30',
    unreadCount: 0,
    members: [
      { userId: 'usr_pavel', displayName: 'Павел', username: 'durov', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533', role: 'member' },
      { userId: 'usr_me_777', displayName: 'Максим (Tech Lead)', username: 'tech_lead', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'member' }
    ]
  }
];

export const mockReelsAndPosts: Post[] = [
  {
    id: 'reel_1',
    userId: 'usr_alex',
    userName: 'Алексей (DevOps)',
    userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
    type: 'reel',
    mediaUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: '⚡ Сравнение latency WebSockets против Server-Sent Events при 100k rps #architecture #devops',
    likesCount: 1342,
    isLiked: false,
    commentsCount: 48,
    comments: [
      {
        id: 'c1',
        userId: 'usr_me_777',
        userName: 'Максим (Tech Lead)',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
        content: 'Для двусторонних кружочков и WebRTC сигналов чистый WS выигрывает.',
        createdAt: '2 часа назад',
        likesCount: 14,
        replies: [
          {
            id: 'c1_1',
            userId: 'usr_alex',
            userName: 'Алексей (DevOps)',
            userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
            content: 'Абсолютно согласен, особенно при наличии connection pooling в Redis.',
            createdAt: '1 час назад',
            likesCount: 5
          }
        ]
      }
    ],
    createdAt: 'Вчера'
  },
  {
    id: 'post_2',
    userId: 'usr_elena',
    userName: 'Елена (Product)',
    userAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
    type: 'post',
    mediaUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoreEngineering&backgroundColor=0284c7',
    mediaType: 'image',
    caption: 'Провели дизайн-ревью гибридного интерфейса: лента сторис сверху, быстрый доступ к чатам снизу. Оцените концепт! 👇',
    likesCount: 589,
    isLiked: true,
    commentsCount: 19,
    comments: [
      {
        id: 'c2',
        userId: 'usr_pavel',
        userName: 'Павел',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
        content: 'Главное — сохранить бескомпромиссную скорость работы на слабых устройствах.',
        createdAt: '3 часа назад',
        likesCount: 32
      }
    ],
    createdAt: '3 часа назад'
  }
];
