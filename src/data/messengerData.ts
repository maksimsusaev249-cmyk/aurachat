import { User, Chat, Post, Story, Message, CommunityGif, CallRecord, Community } from '../types';

export const initialCurrentUser: User = {
  id: 'usr_me',
  phone: '+7 (999) 000-11-22',
  email: 'alex@chatix.app',
  password: 'password123',
  pinCode: '123456',
  hasPin: true,
  username: 'alex_dev',
  displayName: 'Александр',
  avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
  bio: 'Fullstack Engineer • Chatix Platform',
  isPrivate: false,
  hideContacts: false,
  hideOnlineStatus: false,
  isOnline: true,
  lastSeen: 'в сети',
  settings: {
    theme: 'dark',
    language: 'ru',
    textSize: 'normal',
    accentColor: '#5288c1',
    answeringMachine: {
      enabled: true,
      delaySec: 300,
      mode: 'tts',
      ttsVoice: 'ru_female_soft',
      ttsText: 'Здравствуйте! Абонент сейчас не может ответить на ваш звонок. Пожалуйста, оставьте ваше голосовое сообщение после звукового сигнала...',
      presetMessage: 'Я занят, отвечу позже',
      scheduleType: '24/7',
      nightModeAuto: true,
      exceptContactIds: ['u_durov']
    }
  }
};

export const initialStories: Story[] = [];

export const initialChats: Chat[] = [
  {
    id: 'chat_direct_saved',
    type: 'saved',
    title: 'Избранное (Личный чат)',
    description: 'Ваш личный чат для заметок, сохранённых сообщений, фото и файлов.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=SavedMessages&backgroundColor=5288c1',
    isPrivate: true,
    membersCount: 1,
    lastMessage: '📌 Ваш личный чат для сохранения заметок, фото и файлов.',
    lastMessageTime: 'Только что',
    unreadCount: 0,
    members: [
      {
        userId: 'usr_me',
        displayName: 'Александр',
        username: 'alex_dev',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
        role: 'owner',
        customTitle: 'Владелец'
      }
    ]
  },
  {
    id: 'chat_group_arch',
    type: 'group',
    title: '🚀 Core Engineering & Architecture',
    description: 'Архитектура высоконагруженных систем, WebRTC, PostgreSQL и безопасность.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoreEngineering&backgroundColor=0284c7',
    isPrivate: true,
    inviteCode: 'core_arch_hybrid',
    membersCount: 4,
    signMessages: false,
    allowReactions: true,
    lastMessage: 'Кружочки в H.264 передаются через WebSocket бинарный фрейм.',
    lastMessageTime: '11:24',
    unreadCount: 0,
    topics: [
      { id: 'top_all', chatId: 'chat_group_arch', title: 'Все сообщения', icon: '💬', unreadCount: 0 },
      { id: 'top_ кружочки', chatId: 'chat_group_arch', title: 'Кружочки & Войсы', icon: '📹', unreadCount: 0 },
      { id: 'top_webrtc', chatId: 'chat_group_arch', title: 'WebRTC Звонки', icon: '📞', unreadCount: 0 },
      { id: 'top_db', chatId: 'chat_group_arch', title: 'Postgres & Redis', icon: '🗄️', unreadCount: 0 }
    ],
    members: [
      { userId: 'usr_me', displayName: 'Александр', username: 'alex_dev', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'owner', customTitle: 'Владелец' },
      { userId: 'usr_mark', displayName: 'Марк (Архитектор)', username: 'mark_arch', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b', role: 'admin', customTitle: 'Tech Lead', promotedBy: 'Александр' },
      { userId: 'usr_elena', displayName: 'Елена (Дизайн)', username: 'elena_ux', avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95', role: 'member' },
      { userId: 'usr_alex', displayName: 'Алексей (DevOps)', username: 'alex_ops', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533', role: 'member' }
    ],
    bannedMembers: [
      {
        userId: 'usr_spammer_1',
        displayName: 'Crypto Bot Spam',
        username: 'crypto_spam_99',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DanilCyber&backgroundColor=1f2937',
        bannedBy: 'Александр',
        bannedAt: 'Вчера, 19:40',
        reason: 'Рекламный спам и ссылки'
      }
    ],
    adminLog: [
      { id: 'log_1', actorName: 'Александр', action: 'назначил(а) Марк (Архитектор) администратором (Tech Lead)', timestamp: '10:15' },
      { id: 'log_2', actorName: 'Александр', action: '🚫 занёс(ла) в чёрный список @crypto_spam_99', timestamp: 'Вчера' }
    ]
  },
  {
    id: 'chat_channel_news',
    type: 'channel',
    title: '📢 Chatix Official Channel',
    description: 'Официальный канал обновлений Chatix. Только создатель и назначенные админы видят подписчиков и публикуют посты.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ChatixChannel&backgroundColor=2563eb',
    isPrivate: false,
    inviteCode: 'chatix_official',
    membersCount: 4,
    signMessages: true,
    allowReactions: true,
    lastMessage: 'Обновление: Reels с вертикальным свайпом и тредами комментариев доступны всем!',
    lastMessageTime: '10:50',
    unreadCount: 0,
    topics: [
      { id: 'top_news_all', chatId: 'chat_channel_news', title: 'Все анонсы', icon: '📢', unreadCount: 0 },
      { id: 'top_news_releases', chatId: 'chat_channel_news', title: 'Релизы v1.2', icon: '🚀', unreadCount: 0 }
    ],
    members: [
      { userId: 'usr_me', displayName: 'Александр', username: 'alex_dev', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'owner', customTitle: 'Создатель канала' },
      { userId: 'usr_durov', displayName: 'Павел Дуров', username: 'durov', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533', role: 'admin', customTitle: 'Главный редактор', promotedBy: 'Александр' },
      { userId: 'usr_elena', displayName: 'Елена (Дизайн)', username: 'elena_ux', avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95', role: 'member' },
      { userId: 'usr_mark', displayName: 'Марк (Архитектор)', username: 'mark_arch', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b', role: 'member' }
    ],
    bannedMembers: [
      {
        userId: 'usr_troll_1',
        displayName: 'Анонимный Хейтер',
        username: 'toxic_user',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ToxicTroll&backgroundColor=64748b',
        bannedBy: 'Павел Дуров',
        bannedAt: 'Сегодня, 09:30',
        reason: 'Флуд в комментариях'
      }
    ],
    adminLog: [
      { id: 'log_c1', actorName: 'Александр', action: 'назначил(а) Павел Дуров администратором (Главный редактор)', timestamp: '09:00' },
      { id: 'log_c2', actorName: 'Павел Дуров', action: '🚫 занёс(ла) в чёрный список @toxic_user (Флуд в комментариях)', timestamp: '09:30' }
    ]
  },
  {
    id: 'chat_direct_durov',
    type: 'direct',
    title: 'Павел Дуров',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    isPrivate: true,
    membersCount: 2,
    lastMessage: 'Кружочки и аудиозвонки получились очень отзывчивыми. Отличная работа!',
    lastMessageTime: '09:15',
    unreadCount: 0,
    members: [
      { userId: 'usr_durov', displayName: 'Павел Дуров', username: 'durov', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533', role: 'member' },
      { userId: 'usr_me', displayName: 'Александр', username: 'alex_dev', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'member' }
    ]
  },
  {
    id: 'chat_direct_elena',
    type: 'direct',
    title: 'Елена (Дизайн)',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
    isPrivate: true,
    membersCount: 2,
    lastMessage: 'Скинула макеты сторис с 24-часовым таймером в чат.',
    lastMessageTime: 'Вчера',
    unreadCount: 0,
    members: [
      { userId: 'usr_elena', displayName: 'Елена (Дизайн)', username: 'elena_ux', avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95', role: 'member' },
      { userId: 'usr_me', displayName: 'Александр', username: 'alex_dev', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'member' }
    ]
  },
  {
    id: 'chat_gif_hub',
    type: 'channel',
    title: '👾 Общий GIF-Хаб & Стикеры',
    description: 'Общий каталог GIF-анимаций и реакций сообщества.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GifHubStickers&backgroundColor=7c3aed',
    isPrivate: false,
    inviteCode: 'gif_hub_public',
    membersCount: 3,
    signMessages: true,
    allowReactions: true,
    lastMessage: '🔥 Любая гифка, отправленная сюда, сразу появляется в комментариях у всех!',
    lastMessageTime: '12:00',
    unreadCount: 0,
    topics: [
      { id: 'top_gif_all', chatId: 'chat_gif_hub', title: 'Все гифки', icon: '👾', unreadCount: 0 },
      { id: 'top_gif_memes', chatId: 'chat_gif_hub', title: 'Мемы & Реакции', icon: '😂', unreadCount: 0 },
      { id: 'top_gif_coding', chatId: 'chat_gif_hub', title: 'Кодинг & IT', icon: '💻', unreadCount: 0 }
    ],
    members: [
      { userId: 'usr_durov', displayName: 'Павел Дуров', username: 'durov', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533', role: 'owner', customTitle: 'Creator' },
      { userId: 'usr_me', displayName: 'Александр', username: 'alex_dev', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b', role: 'admin', customTitle: 'Модератор' },
      { userId: 'usr_elena', displayName: 'Елена (Дизайн)', username: 'elena_ux', avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95', role: 'member' }
    ],
    bannedMembers: []
  }
];

export const initialMessages: Record<string, Message[]> = {
  chat_direct_saved: [
    {
      id: 'm_saved_1',
      chatId: 'chat_direct_saved',
      senderId: 'usr_me',
      senderName: 'Александр',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
      type: 'text',
      content: '📌 Это ваш личный чат (Избранное). Сохраняйте сюда любые заметки, ссылки, фотографии, документы, голосовые сообщения и видеозаписи.',
      createdAt: '12:00',
      status: 'read'
    }
  ],
  chat_gif_hub: [
    {
      id: 'm_gh_1',
      chatId: 'chat_gif_hub',
      topicId: 'top_gif_all',
      senderId: 'usr_durov',
      senderName: 'Павел Дуров',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      type: 'image',
      content: 'Огонь! Добавил реакцию в общий каталог Chatix 🔥',
      mediaUrl: 'https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif',
      createdAt: '11:00',
      status: 'read'
    },
    {
      id: 'm_gh_2',
      chatId: 'chat_gif_hub',
      topicId: 'top_gif_all',
      senderId: 'usr_me',
      senderName: 'Александр',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
      type: 'image',
      content: 'Когда код компилируется с первого раза без ошибок 💻',
      mediaUrl: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
      createdAt: '11:45',
      status: 'read'
    }
  ],

  chat_group_arch: [
    {
      id: 'm_101',
      chatId: 'chat_group_arch',
      topicId: 'top_all',
      senderId: 'usr_mark',
      senderName: 'Марк (Архитектор)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      type: 'text',
      content: 'Привет! Схема базы данных PostgreSQL 16+ развернута: таблицы users, chats, messages, media и posts с 24-часовым TTL.',
      createdAt: '10:40',
      status: 'read',
      reactions: []
    },
    {
      id: 'm_102',
      chatId: 'chat_group_arch',
      topicId: 'top_ кружочки',
      senderId: 'usr_elena',
      senderName: 'Елена (Дизайн)',
      senderAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
      type: 'voice',
      content: 'Голосовое сообщение',
      mediaMeta: { durationSec: 9, waveform: [20, 45, 80, 100, 70, 30, 60, 90, 40, 20] },
      createdAt: '11:05',
      status: 'read'
    },
    {
      id: 'm_103',
      chatId: 'chat_group_arch',
      topicId: 'top_ кружочки',
      senderId: 'usr_mark',
      senderName: 'Марк (Архитектор)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      type: 'video_note',
      content: 'Круглое видеосообщение',
      mediaUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      mediaMeta: { durationSec: 7 },
      createdAt: '11:15',
      status: 'read'
    },
    {
      id: 'm_104',
      chatId: 'chat_group_arch',
      topicId: 'top_webrtc',
      senderId: 'usr_mark',
      senderName: 'Марк (Архитектор)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      type: 'text',
      content: 'Проверили аудио и видеозвонки WebRTC через WebSocket сигналинг. Задержка минимальная.',
      createdAt: '11:20',
      status: 'read'
    }
  ],
  chat_channel_news: [
    {
      id: 'm_201',
      chatId: 'chat_channel_news',
      senderId: 'usr_durov',
      senderName: 'Павел Дуров',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      type: 'text',
      content: '🚀 Мы объединили скорость и приватность Chatix с визуальным контентом в одной масштабируемой платформе: Stories (24h), Клипы, темы-топики и звонки WebRTC.',
      createdAt: '10:50',
      status: 'read'
    }
  ],
  chat_direct_durov: [
    {
      id: 'm_301',
      chatId: 'chat_direct_durov',
      senderId: 'usr_durov',
      senderName: 'Павел Дуров',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      type: 'video_note',
      content: 'Кружочек от Павла',
      mediaUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      mediaMeta: { durationSec: 12 },
      createdAt: '09:10',
      status: 'read'
    },
    {
      id: 'm_302',
      chatId: 'chat_direct_durov',
      senderId: 'usr_durov',
      senderName: 'Павел Дуров',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
      type: 'text',
      content: 'Кружочки и аудиозвонки получились очень отзывчивыми. Отличная работа!',
      createdAt: '09:15',
      status: 'read'
    }
  ],
  chat_direct_elena: [
    {
      id: 'm_401',
      chatId: 'chat_direct_elena',
      senderId: 'usr_elena',
      senderName: 'Елена (Дизайн)',
      senderAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
      type: 'text',
      content: 'Скинула макеты сторис с 24-часовым таймером в чат.',
      createdAt: 'Вчера 18:40',
      status: 'read'
    }
  ]
};

export const initialReels: Post[] = [];

export const initialPosts: Post[] = [];

/**
 * Returns only real user-published posts (no fake/bot posts injected).
 */
export function getRefreshedPostsFeed(currentPosts: Post[], _cycleSeed: number): Post[] {
  return [...currentPosts];
}

/**
 * Returns only real user-published reels (no fake/bot reels injected).
 */
export function getRefreshedReelsFeed(currentReels: Post[], _cycleSeed: number): Post[] {
  return [...currentReels];
}


export const initialVisitors: any[] = [];

export const initialCommunityGifs: CommunityGif[] = [
  {
    id: 'cgif_1',
    title: 'Огонь! 🔥',
    url: 'https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif',
    authorId: 'usr_durov',
    authorName: 'Павел Дуров',
    authorUsername: 'durov',
    authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    createdAt: 'Вчера',
    usesCount: 0
  },
  {
    id: 'cgif_2',
    title: 'Шок & Восторг 😱',
    url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
    authorId: 'usr_elena',
    authorName: 'Елена (Дизайн)',
    authorUsername: 'elena_ui',
    authorAvatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95',
    createdAt: 'Вчера',
    usesCount: 0
  },
  {
    id: 'cgif_3',
    title: 'Кодинг на реакте 💻',
    url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif',
    authorId: 'usr_me',
    authorName: 'Александр',
    authorUsername: 'alex_dev',
    authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
    createdAt: 'Сегодня',
    usesCount: 0
  },
  {
    id: 'cgif_4',
    title: 'Аплодисменты 👏',
    url: 'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif',
    authorId: 'usr_mark',
    authorName: 'Марк (Архитектор)',
    authorUsername: 'mark_arch',
    authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
    createdAt: 'Сегодня',
    usesCount: 0
  },
  {
    id: 'cgif_5',
    title: 'Победа / Топ 🚀',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    authorId: 'usr_durov',
    authorName: 'Павел Дуров',
    authorUsername: 'durov',
    authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533',
    createdAt: '3 часа назад',
    usesCount: 0
  }
];

export const initialCallRecords: CallRecord[] = [];

export const initialCommunities: Community[] = [];
