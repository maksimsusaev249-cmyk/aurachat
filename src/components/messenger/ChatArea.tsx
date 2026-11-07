import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, User, CommunityGif } from '../../types';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Disc, 
  Send, 
  Play, 
  Pause, 
  CheckCheck, 
  Link2, 
  Users, 
  Shield, 
  ChevronLeft, 
  X, 
  Plus, 
  Lock, 
  Heart, 
  Flame, 
  ThumbsUp, 
  Sparkles,
  Info,
  UserCheck,
  QrCode,
  Music,
  Scissors,
  Download,
  Briefcase,
  Zap,
  KeyRound,
  Bell,
  BellOff,
  Ban,
  Trash2,
  LogOut,
  ShieldAlert,
  AlertCircle,
  Check,
  CornerUpLeft,
  Share2,
  Pin,
  PinOff,
  Search,
  Copy,
  UserPlus,
  Image as ImageIcon,
  FolderPlus
} from 'lucide-react';
import { CreateTopicModal } from './CreateTopicModal';
import { InviteAndQRModal } from './InviteAndQRModal';
import { fileToPersistentUrl } from '../../utils/mediaUtils';
import { JoinRequestsModal } from './JoinRequestsModal';
import { VoiceRecorderStudioModal } from './VoiceRecorderStudioModal';
import { AudioTrimmerModal, TrimmedAudioData } from './AudioTrimmerModal';
import { ChannelManagementModal } from './ChannelManagementModal';
import { ChatInfoModal } from './ChatInfoModal';
import { playSentSound, playReactionSound, playNotificationSound, playVoiceMemoAudio } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { formatSmartTime } from '../../utils/dateUtils';

interface ChatAreaProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onSendMessage: (
    type: 'text' | 'voice' | 'video_note' | 'image' | 'audio' | 'file',
    content?: string,
    mediaUrl?: string,
    meta?: any,
    senderOverride?: { id: string; name: string; avatar: string }
  ) => void;
  onStartCall: (isVideo: boolean) => void;
  onOpenVideoNoteRecorder: () => void;
  onBackMobile?: () => void;
  onCreateTopic?: (chatId: string, title: string, icon: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRequestJoin?: (chatId: string, guestUser: { userId?: string; userName: string; username: string; avatarUrl: string }) => void;
  onApproveRequest?: (chatId: string, request: any) => void;
  onDeclineRequest?: (chatId: string, requestId: string) => void;
  onAddCommunityGif?: (gif: CommunityGif) => void;
  onUpdateChat?: (updatedChat: Chat) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string }) => void;
  onOpenCommunityFeed?: (chat: Chat) => void;
  onDeleteChatHistory?: (chatId: string, forBoth: boolean) => void;
  onDeleteChat?: (chatId: string, forBoth: boolean) => void;
  onDeleteMessage?: (chatId: string, messageId: string, forBoth?: boolean) => void;
  onLeaveChat?: (chatId: string) => void;
  onStartOrOpenSecretChat?: (chatId: string, pin: string) => void;
  onHideSecretChatToNormal?: (chatId: string) => void;
  onEndSecretChat?: (chatId: string) => void;
  isPhoneMode?: boolean;
  deviceViewMode?: 'auto' | 'duo' | 'folded';
  savedAccounts?: User[];
  onlinePeerMap?: Record<string, number>;
}

const quickEmojis = ['❤️', '👍', '🔥', '😂', '🚀', '👏', '⚡', '🎉', '💡', '👀', '🤝', '☕', '😎', '🥳', '🤩', '🙌', '💯', '✨'];

export interface CustomStickerItem {
  id: string;
  url: string;
  title?: string;
  createdAt: number;
}

export interface CustomStickerPack {
  id: string;
  name: string;
  coverUrl?: string;
  authorId?: string;
  authorName?: string;
  shareCode?: string;
  stickers: CustomStickerItem[];
}

const STICKER_STORAGE_KEY = 'aurachat_custom_sticker_packs_v1';

const defaultStickerPacks: CustomStickerPack[] = [
  {
    id: 'pack_my_first',
    name: 'Мои стикеры',
    stickers: [
      {
        id: 'stk_def_1',
        url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=AuraCool&backgroundColor=transparent',
        title: 'Круто!',
        createdAt: 1710000000000
      },
      {
        id: 'stk_def_2',
        url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=AuraLove&backgroundColor=transparent',
        title: 'Супер ❤️',
        createdAt: 1710000001000
      },
      {
        id: 'stk_def_3',
        url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AuraBot&backgroundColor=transparent',
        title: 'На связи',
        createdAt: 1710000002000
      }
    ]
  }
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  currentUser,
  onSendMessage,
  onStartCall,
  onOpenVideoNoteRecorder,
  onBackMobile,
  onCreateTopic,
  onAddReaction,
  onRequestJoin,
  onApproveRequest,
  onDeclineRequest,
  onAddCommunityGif,
  onUpdateChat,
  onOpenUserProfile,
  onOpenCommunityFeed,
  onDeleteChatHistory,
  onDeleteChat,
  onDeleteMessage,
  onLeaveChat,
  onStartOrOpenSecretChat,
  onHideSecretChatToNormal,
  onEndSecretChat,
  isPhoneMode = false,
  deviceViewMode = 'auto',
  savedAccounts = [],
  onlinePeerMap = {}
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const [activeTopicId, setActiveTopicId] = useState<string | null>(
    chat.topics ? chat.topics[0]?.id : null
  );

  // Audio / Video note playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({});
  const [playingVideoNoteId, setPlayingVideoNoteId] = useState<string | null>(null);
  const videoNoteRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Custom Audio / Music Attachment state
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [isAudioTrimmerOpen, setIsAudioTrimmerOpen] = useState(false);
  const [playingMusicMsgId, setPlayingMusicMsgId] = useState<string | null>(null);
  const activeMusicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Three dots action menu & modals (Заблокировать, Секретный чат 6-код, Выключить звук, Удалить, Покинуть)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isSecretChat = Boolean(chat.isSecretChat);
  const hasLinkedSecretChat = Boolean(chat.linkedSecretChatId);
  const [pinModalMode, setPinModalMode] = useState<'create' | 'unlock'>('create');
  const [showSecretPinModal, setShowSecretPinModal] = useState(false);
  const [pinKeypadInput, setPinKeypadInput] = useState('');
  const [pinKeypadError, setPinKeypadError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Modals & Panels
  const [showInviteCopied, setShowInviteCopied] = useState(false);
  const [showGifHubBanner, setShowGifHubBanner] = useState(true);
  const [showChatInfoModal, setShowChatInfoModal] = useState(false);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [isInviteAndQROpen, setIsInviteAndQROpen] = useState(false);
  const [isJoinRequestsOpen, setIsJoinRequestsOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emojis' | 'stickers'>('stickers');

  // Custom Sticker Packs State (самодельные стикеры и паки через плюсик)
  const [stickerPacks, setStickerPacks] = useState<CustomStickerPack[]>(() => {
    try {
      const raw = localStorage.getItem(STICKER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultStickerPacks;
  });
  const [activeStickerPackId, setActiveStickerPackId] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(STICKER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed[0]?.id) return parsed[0].id;
      }
    } catch {}
    return 'pack_my_first';
  });
  const [isCreatePackModalOpen, setIsCreatePackModalOpen] = useState(false);
  const [newStickerPackName, setNewStickerPackName] = useState('');
  const [newStickerPackCover, setNewStickerPackCover] = useState<string>('');
  const [isAddStickerModalOpen, setIsAddStickerModalOpen] = useState(false);
  const [newStickerRawImage, setNewStickerRawImage] = useState<string>('');
  const [newStickerCaption, setNewStickerCaption] = useState<string>('');
  const [viewingPackModal, setViewingPackModal] = useState<{
    pack: CustomStickerPack;
    isSaved: boolean;
  } | null>(null);

  // Pre-Send Image/Video + Caption Preview State ("сначала картинка и надпись, потом отправляешь")
  const [pendingMediaAttachment, setPendingMediaAttachment] = useState<{
    url: string;
    isVideo: boolean;
    fileName?: string;
  } | null>(null);
  const [pendingMediaCaption, setPendingMediaCaption] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(stickerPacks));
    } catch {}
  }, [stickerPacks]);

  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // VK Messenger Advanced Features State
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [audioSpeedMap, setAudioSpeedMap] = useState<Record<string, 1 | 1.5 | 2>>({});
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  // Typing status indicator simulation
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Manager / Interlocutor Sender Mode (работа менеджера с чатом)
  const [senderRole, setSenderRole] = useState<'me' | 'interlocutor'>('me');
  const [showManagerTemplates, setShowManagerTemplates] = useState(false);

  // RBAC active role in this chat
  const matchedMember = chat.members?.find(
    (m) =>
      m.userId === currentUser.id ||
      (m.username && currentUser.username && m.username.toLowerCase() === currentUser.username.toLowerCase())
  );
  const defaultMemberRole = (matchedMember?.role ||
    (!chat.members || chat.members.length === 0 ? 'owner' : 'member')) as 'owner' | 'admin' | 'member';
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>(defaultMemberRole);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isMemberOfChat = Boolean(matchedMember) || !chat.requiresApproval;
  const pendingChatRequests = chat.joinRequests || [];
  const myPendingChatRequest = pendingChatRequests.find(
    (r) =>
      r.userId === currentUser.id ||
      (r.username && currentUser.username && r.username.toLowerCase() === currentUser.username.toLowerCase())
  );
  const hasPendingChatRequest = Boolean(myPendingChatRequest);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTopicsRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll state for topics bar
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chatTopicsRef.current) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setStartX(e.pageX - chatTopicsRef.current.offsetLeft);
    setScrollLeftState(chatTopicsRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !chatTopicsRef.current) return;
    const x = e.pageX - chatTopicsRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
      e.preventDefault();
      chatTopicsRef.current.scrollLeft = scrollLeftState - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  useEffect(() => {
    if (chat.topics && chat.topics.length > 0) {
      setActiveTopicId(chat.topics[0].id);
    } else {
      setActiveTopicId(null);
    }
    const found = chat.members?.find(
      (m) =>
        m.userId === currentUser.id ||
        (m.username && currentUser.username && m.username.toLowerCase() === currentUser.username.toLowerCase())
    );
    const hasExplicitRealOwner = chat.members?.some(
      (m) => m.role === 'owner' && !m.userId.startsWith('usr_')
    );
    const role = (found?.role || (!hasExplicitRealOwner ? 'owner' : 'member')) as 'owner' | 'admin' | 'member';
    setUserRole(role);
  }, [chat.id, currentUser.id, currentUser.username, chat.members]);

  // Close 3-dots dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreMenu]);

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleToggleBlock = () => {
    setShowMoreMenu(false);
    playReactionSound();
    setIsBlocked((prev) => {
      const next = !prev;
      triggerToast(next ? `🚫 Собеседник «${chat.title}» заблокирован` : `✅ Собеседник «${chat.title}» разблокирован`);
      return next;
    });
  };

  const handleToggleMute = () => {
    setShowMoreMenu(false);
    playReactionSound();
    setIsMuted((prev) => {
      const next = !prev;
      triggerToast(next ? '🔕 Звук уведомлений выключен' : '🔔 Звук уведомлений включен');
      return next;
    });
  };

  const handleOpenSecretPinModal = (modeOverride?: 'create' | 'unlock') => {
    setShowMoreMenu(false);
    setPinModalMode(modeOverride || (hasLinkedSecretChat ? 'unlock' : 'create'));
    setPinKeypadInput('');
    setPinKeypadError('');
    setShowSecretPinModal(true);
  };

  const handleConfirmSecretPin = (pin: string) => {
    if (pin.length !== 6) {
      setPinKeypadError('Код должен состоять ровно из 6 цифр');
      return;
    }
    if (pinModalMode === 'unlock' && chat.linkedSecretPin && pin !== chat.linkedSecretPin) {
      setPinKeypadError('Неверный 6-значный PIN-код от скрытого секретного чата');
      return;
    }
    setShowSecretPinModal(false);
    setPinKeypadInput('');
    setPinKeypadError('');
    if (onStartOrOpenSecretChat) {
      onStartOrOpenSecretChat(chat.id, pin);
    } else {
      playSentSound();
      triggerToast('🔒 Секретный чат с 6-значным паролем активирован');
    }
  };

  const handleEndSecretChat = () => {
    setShowMoreMenu(false);
    if (onEndSecretChat) {
      onEndSecretChat(chat.id);
    } else {
      playReactionSound();
      triggerToast('Секретный чат завершён и удалён. Возврат в исходный диалог.');
    }
  };

  const handleConfirmDeleteChat = (forBoth: boolean) => {
    setShowDeleteModal(false);
    playSentSound();
    if (onDeleteChat) {
      onDeleteChat(chat.id, forBoth);
    } else if (onDeleteChatHistory) {
      onDeleteChatHistory(chat.id, forBoth);
    }
    triggerToast(forBoth ? '🗑 Чат удалён у обоих собеседников' : '🗑 Чат удалён только у вас');
  };

  const handleConfirmLeaveChat = () => {
    setShowLeaveModal(false);
    playSentSound();
    if (onLeaveChat) {
      onLeaveChat(chat.id);
    }
    triggerToast(chat.type === 'channel' ? 'Вы покинули канал' : 'Вы покинули группу');
  };

  // Handle Send: реальная отправка сообщения в AuraChat (или мгновенный вход в скрытый секретный чат при вводе PIN)
  const handleSend = () => {
    if (isBlocked) {
      triggerToast('Собеседник заблокирован. Разблокируйте, чтобы отправлять сообщения.');
      return;
    }
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();

    // Если с этим человеком есть скрытый секретный чат и пользователь ввёл свой 6-значный PIN — мгновенно входим в скрытый чат!
    if (!isSecretChat && hasLinkedSecretChat && chat.linkedSecretPin && textToSend === chat.linkedSecretPin && onStartOrOpenSecretChat) {
      setInputText('');
      onStartOrOpenSecretChat(chat.id, textToSend);
      return;
    }

    setInputText('');
    setShowEmojiPicker(false);
    setShowManagerTemplates(false);

    const replyMeta = {
      ...(replyingToMessage
        ? {
            replyTo: {
              id: replyingToMessage.id,
              senderName: replyingToMessage.senderName,
              content: replyingToMessage.content || 'Медиасообщение'
            }
          }
        : {}),
      ...(activeTopicId ? { topicId: activeTopicId } : {})
    };

    setReplyingToMessage(null);
    playSentSound();

    if (senderRole === 'interlocutor') {
      // Отправка от лица собеседника / менеджера
      onSendMessage('text', textToSend, undefined, replyMeta, {
        id: chat.id,
        name: chat.title,
        avatar: chat.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(chat.title)}`
      });
    } else {
      // Отправка от лица текущего пользователя
      onSendMessage('text', textToSend, undefined, replyMeta);
    }
  };

  const handleCopyInvite = () => {
    const code = chat.inviteCode || chat.id.replace(/^chat_/, '');
    navigator.clipboard.writeText(`https://aurachat.app/join/${code}`);
    setShowInviteCopied(true);
    setTimeout(() => setShowInviteCopied(false), 2000);
  };

  // Создание нового пака стикеров (до 70 шт. максимально, с названием и главной обложкой)
  const handleCreateStickerPack = async () => {
    const title = newStickerPackName.trim();
    if (!title) return;
    playSentSound();
    let finalCoverUrl = newStickerPackCover.trim();
    if (!finalCoverUrl) {
      finalCoverUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(title)}&backgroundColor=141416`;
    }
    const packId = 'pack_' + Date.now();
    const shareCode = 'stk_' + Math.random().toString(36).slice(2, 9);
    const newPack: CustomStickerPack = {
      id: packId,
      name: title,
      coverUrl: finalCoverUrl,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      shareCode,
      stickers: [
        // Main cover sticker is automatically added as sticker #1
        {
          id: 'stk_main_' + Date.now(),
          url: finalCoverUrl,
          title: 'Главный стикер',
          createdAt: Date.now()
        }
      ]
    };
    setStickerPacks((prev) => [...prev, newPack]);
    setActiveStickerPackId(newPack.id);
    setNewStickerPackName('');
    setNewStickerPackCover('');
    setIsCreatePackModalOpen(false);
    triggerToast(`✨ Пак стикеров «${title}» создан! Добавлено главное изображение.`);
  };

  // Копирование публичной / приватной ссылки на стикерпак владельца
  const handleCopyStickerPackLink = (pack: CustomStickerPack) => {
    const code = pack.shareCode || pack.id.replace(/^pack_/, '');
    const packUrl = `https://aurachat.app/stickers/${code}`;
    navigator.clipboard.writeText(packUrl);
    playReactionSound();
    triggerToast(`📋 Ссылка на стикерпак «${pack.name}» скопирована!`);
  };

  // Отправка всего стикерпака в чат, чтобы собеседник мог его открыть и сохранить
  const handleSendStickerPackIntoChat = (pack: CustomStickerPack) => {
    if (isBlocked) {
      triggerToast('Собеседник заблокирован.');
      return;
    }
    playSentSound();
    const cover = pack.coverUrl || pack.stickers[0]?.url || 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=AuraSticker';
    onSendMessage(
      'image',
      `Пак стикеров «${pack.name}» (${pack.stickers.length} шт.)`,
      cover,
      {
        isSticker: true,
        stickerPackName: pack.name,
        stickerPackId: pack.id,
        stickerPackCover: cover,
        stickerPackItems: pack.stickers.slice(0, 70).map((s) => ({ id: s.id, url: s.url, title: s.title })),
        mediaUrl: cover,
        topicId: activeTopicId || undefined
      }
    );
    setShowEmojiPicker(false);
    triggerToast(`🚀 Пак «${pack.name}» отправлен в чат!`);
  };

  // Установка стикерпака к себе в подборку
  const handleSaveStickerPackToCollection = (packToSave: CustomStickerPack) => {
    playSentSound();
    setStickerPacks((prev) => {
      const exists = prev.some((p) => p.id === packToSave.id || (p.name.toLowerCase() === packToSave.name.toLowerCase() && p.stickers.length === packToSave.stickers.length));
      if (exists) {
        return prev;
      }
      return [...prev, packToSave];
    });
    setActiveStickerPackId(packToSave.id);
    if (viewingPackModal) {
      setViewingPackModal({ pack: packToSave, isSaved: true });
    }
    triggerToast(`✅ Пак «${packToSave.name}» успешно установлен в вашу подборку!`);
  };

  // Удаление стикерпака из подборки
  const handleRemoveStickerPackFromCollection = (packToRemove: CustomStickerPack) => {
    playReactionSound();
    setStickerPacks((prev) => {
      const filtered = prev.filter((p) => p.id !== packToRemove.id && p.name.toLowerCase() !== packToRemove.name.toLowerCase());
      if (filtered.length === 0) {
        return defaultStickerPacks;
      }
      return filtered;
    });
    if (activeStickerPackId === packToRemove.id) {
      setActiveStickerPackId(stickerPacks[0]?.id || 'pack_my_first');
    }
    if (viewingPackModal) {
      setViewingPackModal({ pack: packToRemove, isSaved: false });
    }
    triggerToast(`🗑️ Пак «${packToRemove.name}» удалён из вашей подборки`);
  };

  // Генерация самодельного стикера 320x320 на <canvas> с картинкой и надписью
  const buildCustomStickerDataUrl = (rawImgUrl: string, textOverlay: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawImgUrl);
            return;
          }

          ctx.clearRect(0, 0, size, size);

          // Fit image nicely with padding for sticker outline
          const pad = 16;
          const maxW = size - pad * 2;
          const maxH = size - pad * 2;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const dx = (size - drawW) / 2;
          const dy = (size - drawH) / 2;

          ctx.save();
          // Rounded sticker clip
          const radius = 36;
          ctx.beginPath();
          ctx.moveTo(dx + radius, dy);
          ctx.lineTo(dx + drawW - radius, dy);
          ctx.quadraticCurveTo(dx + drawW, dy, dx + drawW, dy + radius);
          ctx.lineTo(dx + drawW, dy + drawH - radius);
          ctx.quadraticCurveTo(dx + drawW, dy + drawH, dx + drawW - radius, dy + drawH);
          ctx.lineTo(dx + radius, dy + drawH);
          ctx.quadraticCurveTo(dx, dy + drawH, dx, dy + drawH - radius);
          ctx.lineTo(dx, dy + radius);
          ctx.quadraticCurveTo(dx, dy, dx + radius, dy);
          ctx.closePath();

          // White sticker border
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.clip();
          ctx.drawImage(img, dx, dy, drawW, drawH);
          ctx.restore();

          // Draw caption text on sticker if provided
          const cleanText = textOverlay.trim();
          if (cleanText) {
            ctx.save();
            ctx.font = '900 28px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 7;
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#ffffff';
            const textY = size - 18;
            ctx.strokeText(cleanText, size / 2, textY, size - 24);
            ctx.fillText(cleanText, size / 2, textY, size - 24);
            ctx.restore();
          }

          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(rawImgUrl);
        }
      };
      img.onerror = () => resolve(rawImgUrl);
      img.src = rawImgUrl;
    });
  };

  const handleSaveCustomSticker = async () => {
    if (!newStickerRawImage) return;
    const targetPack = stickerPacks.find((p) => p.id === activeStickerPackId);
    if (targetPack && targetPack.stickers.length >= 70) {
      triggerToast('⚠️ В одном стикерпаке может быть максимум 70 стикеров!');
      return;
    }
    playSentSound();
    const finalStickerUrl = await buildCustomStickerDataUrl(newStickerRawImage, newStickerCaption);
    const newSticker: CustomStickerItem = {
      id: 'stk_' + Date.now(),
      url: finalStickerUrl,
      title: newStickerCaption.trim() || 'Стикер',
      createdAt: Date.now()
    };

    setStickerPacks((prev) =>
      prev.map((p) =>
        p.id === activeStickerPackId
          ? { ...p, stickers: [newSticker, ...p.stickers].slice(0, 70) }
          : p
      )
    );
    setNewStickerRawImage('');
    setNewStickerCaption('');
    setIsAddStickerModalOpen(false);
    triggerToast('🎨 Стикер добавлен в пак (макс. 70 шт.)!');
  };

  const handleSendSticker = (sticker: CustomStickerItem, packName?: string) => {
    if (isBlocked) {
      triggerToast('Собеседник заблокирован.');
      return;
    }
    playSentSound();
    const activePackObj = stickerPacks.find((p) => p.name === packName || p.id === activeStickerPackId);
    onSendMessage(
      'image',
      sticker.title ? `Стикер: ${sticker.title}` : 'Стикер',
      sticker.url,
      {
        isSticker: true,
        stickerTitle: sticker.title,
        stickerPackName: packName || 'Мои стикеры',
        stickerPackId: activePackObj?.id,
        stickerPackCover: activePackObj?.coverUrl || sticker.url,
        stickerPackItems: activePackObj?.stickers?.slice(0, 70).map((s) => ({ id: s.id, url: s.url, title: s.title })),
        mediaUrl: sticker.url,
        topicId: activeTopicId || undefined
      }
    );
    setShowEmojiPicker(false);
  };

  const handleConfirmSendPendingMedia = () => {
    if (!pendingMediaAttachment) return;
    playSentSound();
    const captionText = pendingMediaCaption.trim();
    const fallbackLabel = pendingMediaAttachment.isVideo ? 'Видеозапись' : 'Фотография';

    onSendMessage(
      'image',
      captionText || fallbackLabel,
      pendingMediaAttachment.url,
      {
        topicId: activeTopicId || undefined,
        isVideo: pendingMediaAttachment.isVideo,
        caption: captionText || undefined
      }
    );

    if (chat.id === 'chat_gif_hub' && onAddCommunityGif && !pendingMediaAttachment.isVideo) {
      onAddCommunityGif({
        id: 'cgif_' + Date.now(),
        title: captionText || ('Реакция от @' + currentUser.username),
        url: pendingMediaAttachment.url,
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatarUrl,
        createdAt: 'Только что',
        usesCount: 1
      });
    }

    setPendingMediaAttachment(null);
    setPendingMediaCaption('');
  };

  const handleToggleVoice = (msgId: string, durationSec: number = 8, mediaUrl?: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
      setAudioProgressMap((prev) => ({ ...prev, [msgId]: 0 }));
      playVoiceMemoAudio(0, () => {}, () => {});
      return;
    }

    setPlayingAudioId(msgId);
    playVoiceMemoAudio(
      durationSec,
      (pct) => setAudioProgressMap((prev) => ({ ...prev, [msgId]: pct })),
      () => {
        setPlayingAudioId(null);
        setAudioProgressMap((prev) => ({ ...prev, [msgId]: 0 }));
      },
      mediaUrl
    );
  };

  const handleToggleVideoNote = (msgId: string) => {
    const targetVideo = videoNoteRefs.current[msgId];
    if (playingVideoNoteId === msgId) {
      if (targetVideo) {
        targetVideo.pause();
      }
      setPlayingVideoNoteId(null);
      return;
    }

    // Pause any other playing video note
    if (playingVideoNoteId && videoNoteRefs.current[playingVideoNoteId]) {
      try {
        videoNoteRefs.current[playingVideoNoteId]?.pause();
      } catch {}
    }

    setPlayingVideoNoteId(msgId);
    if (targetVideo) {
      targetVideo.muted = false;
      targetVideo.volume = 1;
      targetVideo.play().catch(() => {});
    } else {
      playReactionSound();
    }
  };

  const handleToggleMusicMessage = (msg: Message) => {
    if (playingMusicMsgId === msg.id) {
      if (activeMusicAudioRef.current) {
        activeMusicAudioRef.current.pause();
      }
      setPlayingMusicMsgId(null);
      return;
    }

    if (activeMusicAudioRef.current) {
      activeMusicAudioRef.current.pause();
    }

    if (msg.mediaUrl) {
      const audio = new Audio(msg.mediaUrl);
      if (msg.mediaMeta?.trimmedStartSec) {
        audio.currentTime = msg.mediaMeta.trimmedStartSec;
      }
      activeMusicAudioRef.current = audio;
      audio.play()
        .then(() => setPlayingMusicMsgId(msg.id))
        .catch(() => setPlayingMusicMsgId(msg.id));

      audio.onended = () => {
        setPlayingMusicMsgId(null);
      };
    } else {
      playReactionSound();
      setPlayingMusicMsgId(playingMusicMsgId === msg.id ? null : msg.id);
    }
  };

  const handleAudioFileSelected = (file: File) => {
    setPendingAudioFile(file);
    setIsAudioTrimmerOpen(true);
  };

  const handleConfirmTrimmedAudio = (data: TrimmedAudioData) => {
    playSentSound();
    onSendMessage('audio', `${data.artist} — ${data.title}`, data.audioUrl, {
      durationSec: data.trimmedLengthSec,
      sizeBytes: data.sizeBytes,
      fileName: data.fileName,
      title: data.title,
      artist: data.artist,
      trimmedStartSec: data.trimmedStartSec,
      trimmedLengthSec: data.trimmedLengthSec,
      topicId: activeTopicId || undefined
    });
    setPendingAudioFile(null);
  };

  const handleReactionClick = (msgId: string, emoji: string) => {
    playReactionSound();
    if (onAddReaction) {
      onAddReaction(msgId, emoji);
    }
    setHoveredMessageId(null);
  };

  const displayMessages = React.useMemo(() => {
    const seenIds = new Set<string>();
    const defaultTopicId = chat.topics?.[0]?.id;
    const isMainOrAllTopic =
      !activeTopicId ||
      activeTopicId === 'top_all' ||
      activeTopicId === 'top_main' ||
      activeTopicId === defaultTopicId;

    return messages.filter((m) => {
      if (!m || !m.id) return false;
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      if (chat.topics && chat.topics.length > 0 && activeTopicId) {
        if (isMainOrAllTopic) {
          return !m.topicId || m.topicId === activeTopicId || m.topicId === 'top_main' || m.topicId === 'top_all';
        }
        return m.topicId === activeTopicId;
      }
      return true;
    });
  }, [messages, chat.topics, activeTopicId]);

  const isGroupOrChannel = chat.type === 'group' || chat.type === 'channel';

  // Realistic online & read status for direct interlocutor:
  // Checks custom status from Settings (savedAccounts), live onlinePeerMap, or read status of latest message
  const peerPresence = React.useMemo(() => {
    if (chat.type !== 'direct') {
      return { isOnline: false, statusText: '' };
    }
    const peerMember = chat.members?.find((m) => m.userId !== currentUser.id) || chat.members?.[0];
    const matchedAccount = savedAccounts.find(
      (acc) =>
        acc.id !== currentUser.id &&
        ((peerMember && (acc.id === peerMember.userId || acc.username.toLowerCase() === peerMember.username.toLowerCase())) ||
          acc.displayName.toLowerCase() === chat.title.toLowerCase())
    );

    if (matchedAccount) {
      if (matchedAccount.hideOnlineStatus) {
        return { isOnline: false, statusText: 'был(а) в сети недавно' };
      }
      if (matchedAccount.isOnline && (!matchedAccount.lastSeen || matchedAccount.lastSeen === 'в сети')) {
        return { isOnline: true, statusText: 'в сети' };
      }
      if (matchedAccount.lastSeen) {
        return { isOnline: matchedAccount.lastSeen === 'в сети', statusText: matchedAccount.lastSeen };
      }
    }

    const lastMyMsg = [...displayMessages].reverse().find((m) => m.senderId === currentUser.id);
    const lastPeerMsg = [...displayMessages].reverse().find((m) => m.senderId !== currentUser.id);

    // If interlocutor entered the chat recently or read our latest outgoing message -> interlocutor is online
    if (
      (onlinePeerMap[chat.id] && Date.now() - onlinePeerMap[chat.id] < 120000) ||
      (lastMyMsg && lastMyMsg.status === 'read')
    ) {
      return { isOnline: true, statusText: 'в сети' };
    }

    // Check if interlocutor sent a message very recently (within 2 minutes)
    if (lastPeerMsg && lastPeerMsg.createdAt) {
      const parsed = Date.parse(lastPeerMsg.createdAt);
      if (!isNaN(parsed)) {
        const diffMin = Math.max(1, Math.floor((Date.now() - parsed) / 60000));
        if (diffMin <= 2 && (!lastMyMsg || lastMyMsg.status === 'read')) {
          return { isOnline: true, statusText: 'в сети' };
        }
        if (diffMin < 60) {
          return { isOnline: false, statusText: `был(а) ${diffMin} мин назад` };
        }
      }
    }

    // Deterministic realistic "был(а) X мин назад" or "был(а) в сети недавно" so not everyone is immediately online
    const seedStr = chat.id || chat.title || 'peer';
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) % 1000;
    }
    const statusOptions = [
      'был(а) в сети недавно',
      'был(а) 1 мин назад',
      'был(а) 3 мин назад',
      'был(а) 5 мин назад',
      'был(а) 12 мин назад'
    ];
    return {
      isOnline: false,
      statusText: statusOptions[hash % statusOptions.length]
    };
  }, [chat.type, chat.id, chat.title, chat.members, displayMessages, currentUser.id, savedAccounts, onlinePeerMap, nowTick]);

  return (
    <div className="flex-1 h-full w-full min-w-0 max-w-full flex flex-col bg-[#141414] relative overflow-hidden text-[#e1e3e6] select-none min-h-0">
      {/* 1. TOP HEADER (VKontakte Messenger Header) */}
      <div className="w-full min-w-0 max-w-full px-3 sm:px-4 py-2.5 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between gap-1 sm:gap-2 shrink-0 z-20">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          {onBackMobile && deviceViewMode !== 'duo' && (
            <button
              onClick={onBackMobile}
              className={`${isPhoneMode || deviceViewMode === 'folded' ? 'flex' : 'min-[620px]:hidden flex'} items-center justify-center p-1 -ml-0.5 text-[#71aaeb] hover:text-white rounded-lg shrink-0 cursor-pointer`}
              title="Назад к списку чатов"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => setShowChatInfoModal(true)}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1 overflow-hidden"
          >
            <div className="relative shrink-0">
              <img
                src={chat.avatarUrl}
                alt={chat.title}
                className={`w-9 h-9 rounded-full object-cover group-hover:opacity-90 transition ${isSecretChat ? 'ring-2 ring-emerald-400' : ''}`}
              />
              {chat.type === 'direct' && peerPresence.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#222222] bg-emerald-500" />
              )}
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-semibold text-xs sm:text-[13px] text-white truncate group-hover:text-[#71aaeb] transition flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{chat.title}</span>
                  {isMuted && (
                    <span title="Уведомления выключены">
                      <BellOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    </span>
                  )}
                  {isSecretChat && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 shrink-0">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Скрытый E2E</span>
                    </span>
                  )}
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40 shrink-0">
                      <Ban className="w-3 h-3 text-rose-400" />
                      <span>Заблокирован</span>
                    </span>
                  )}
                </h3>
                {chat.type === 'channel' && <span className="text-[10px] text-[#71aaeb] shrink-0">📢</span>}
              </div>

              <div className="text-[10px] sm:text-[11px] text-[#828282] truncate flex items-center gap-1.5">
                {typingUser ? (
                  <span className="text-[#71aaeb] font-medium flex items-center gap-1 truncate">
                    <span className="truncate">{typingUser}</span>
                  </span>
                ) : isSecretChat ? (
                  <span className="text-emerald-400 font-medium truncate">Скрытый секретный чат • Защищён PIN</span>
                ) : chat.type === 'saved' ? (
                  <span className="text-[#71aaeb] font-medium">Личное хранилище • 1 человек (только вы)</span>
                ) : chat.type === 'direct' ? (
                  peerPresence.isOnline ? (
                    <span className="text-emerald-400 font-medium">в сети</span>
                  ) : (
                    <span className="text-[#828282]">{peerPresence.statusText}</span>
                  )
                ) : (
                  <span className="truncate">{chat.membersCount} {chat.type === 'channel' ? 'подписчиков' : 'участников'}</span>
                )}

                {isGroupOrChannel && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2c2d2e] text-[#939393] font-medium shrink-0">
                    {userRole === 'owner' ? 'Создатель' : userRole === 'admin' ? 'Модератор' : 'Участник'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-[#939393] shrink-0 ml-1">
          {/* Кнопка быстрого входа в скрытый секретный чат с этим человеком */}
          {!isSecretChat && chat.type === 'direct' && hasLinkedSecretChat && (
            <button
              onClick={() => handleOpenSecretPinModal('unlock')}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-xs"
              title="Открыть скрытый секретный чат с этим человеком (по 6-значному PIN-коду)"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              <span className="hidden xs:inline">Секретный</span>
            </button>
          )}

          {isGroupOrChannel && (
            <button
              onClick={() => setShowGroupInfoModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-[11px] font-medium flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Управление сообществом и участниками"
            >
              <Shield className="w-3.5 h-3.5 text-[#71aaeb]" />
              <span className="hidden lg:inline">Управление</span>
            </button>
          )}

          <button
            onClick={() => setIsChatSearchOpen((prev) => !prev)}
            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
              isChatSearchOpen ? 'bg-[#0077FF] text-white' : 'hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white'
            }`}
            title="Поиск по истории сообщений в чате AuraChat"
          >
            <Search className="w-4 h-4" />
          </button>

          {chat.inviteCode && (
            <button
              onClick={() => setIsInviteAndQROpen(true)}
              className="hidden sm:flex p-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white transition cursor-pointer shrink-0"
              title="Ссылка и QR-код для приглашения"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          {chat.type !== 'saved' && (
            <>
              {(chat.type === 'group' || chat.type === 'channel') ? (
                <>
                  <button
                    onClick={() => onStartCall(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                    title="Начать видеоконференцию с демонстрацией экрана в беседе"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Конференция</span>
                  </button>

                  <button
                    onClick={() => onStartCall(false)}
                    className="p-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white transition cursor-pointer shrink-0"
                    title="Голосовой чат беседы"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (isBlocked) {
                        triggerToast('Собеседник заблокирован. Звонки недоступны.');
                        return;
                      }
                      onStartCall(false);
                    }}
                    disabled={isBlocked}
                    className="p-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                    title={isBlocked ? 'Собеседник заблокирован' : 'Аудиозвонок AuraChat'}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (isBlocked) {
                        triggerToast('Собеседник заблокирован. Звонки недоступны.');
                        return;
                      }
                      onStartCall(true);
                    }}
                    disabled={isBlocked}
                    className="p-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                    title={isBlocked ? 'Собеседник заблокирован' : 'Видеозвонок с демонстрацией экрана'}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}

          {/* THREE DOTS ACTION MENU */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                showMoreMenu ? 'bg-[#0077FF] text-white' : 'hover:bg-[#2c2d2e] hover:text-white'
              }`}
              title="Меню действий чата"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* DROPDOWN MENU */}
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1c1c20] border border-[#333338] shadow-2xl rounded-2xl p-1.5 z-50 text-xs text-[#e1e3e6] animate-in fade-in zoom-in-95 duration-150">
                {chat.type === 'saved' ? (
                  <>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        if (onDeleteChatHistory) {
                          onDeleteChatHistory(chat.id, false);
                        }
                        triggerToast('🧹 Личное хранилище «Избранное» очищено');
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">Очистить хранилище</div>
                        <div className="text-[10px] text-rose-300/70">
                          Удалить сохранённые заметки и файлы
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowChatInfoModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] text-[#939393] hover:text-white flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      <span>О хранилище (1 человек)</span>
                    </button>
                  </>
                ) : chat.type === 'direct' ? (
                  <>
                    {/* 0. Добавить человека / Ссылка / QR-код */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setIsInviteAndQROpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#0077FF]/15 text-[#71aaeb] flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 shrink-0 text-[#0077FF]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">Добавить человека</div>
                        <div className="text-[10px] text-[#71aaeb]">
                          По контакту, ссылке или QR-коду
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-[#2e2e32]" />

                    {/* 1. Заблокировать / Разблокировать */}
                    <button
                      onClick={handleToggleBlock}
                      className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 transition text-left cursor-pointer ${
                        isBlocked
                          ? 'hover:bg-emerald-500/15 text-emerald-400'
                          : 'hover:bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      <Ban className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {isBlocked ? 'Снять блокировку собеседника' : 'Ограничить звонки и сообщения'}
                        </div>
                      </div>
                    </button>

                    {/* 2. Секретный чат (Создать / Войти в скрытый / Скрыть / Завершить и удалить) */}
                    {isSecretChat ? (
                      <>
                        <button
                          onClick={() => {
                            setShowMoreMenu(false);
                            if (onHideSecretChatToNormal) onHideSecretChatToNormal(chat.id);
                          }}
                          className="w-full px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-emerald-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                        >
                          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">Скрыть секретный чат</div>
                            <div className="text-[10px] opacity-70">
                              Вернуться в обычный диалог (чат останется скрытым)
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={handleEndSecretChat}
                          className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">Завершить секретный чат</div>
                            <div className="text-[10px] opacity-70">
                              Удалить секретный чат и вернуться в исходное положение
                            </div>
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenSecretPinModal(hasLinkedSecretChat ? 'unlock' : 'create')}
                        className="w-full px-3 py-2 rounded-xl hover:bg-emerald-500/15 text-emerald-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>{hasLinkedSecretChat ? 'Войти в скрытый секретный чат' : 'Начать секретный чат'}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              6-код
                            </span>
                          </div>
                          <div className="text-[10px] opacity-70">
                            {hasLinkedSecretChat
                              ? 'Ввести PIN и открыть скрытый чат с этим человеком'
                              : 'Создать новый скрытый чат с паролем 6-код'}
                          </div>
                        </div>
                      </button>
                    )}

                    {/* 3. Выключить звук */}
                    <button
                      onClick={handleToggleMute}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] flex items-center gap-2.5 transition text-left cursor-pointer text-[#e1e3e6]"
                    >
                      {isMuted ? (
                        <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {isMuted ? 'Включить звук' : 'Выключить звук'}
                        </div>
                        <div className="text-[10px] text-[#828282]">
                          {isMuted ? 'Оповещения активированы' : 'Без звуковых уведомлений'}
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-[#2e2e32]" />

                    {/* 4. Удалить чат (у себя и у двоих) */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">Удалить чат</div>
                        <div className="text-[10px] text-rose-300/70">
                          У себя или у двоих
                        </div>
                      </div>
                    </button>

                    {/* 5. Информация */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowChatInfoModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] text-[#939393] hover:text-white flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Информация о собеседнике</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Groups and Channels */}
                    {/* 0. Добавить человека (или ссылка / QR-код) */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setIsInviteAndQROpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#0077FF]/15 hover:bg-[#0077FF]/25 text-white flex items-center gap-2.5 transition text-left cursor-pointer mb-1 border border-[#0077FF]/30"
                    >
                      <UserPlus className="w-4 h-4 shrink-0 text-[#71aaeb]" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white">Добавить человека</div>
                        <div className="text-[10px] text-[#71aaeb]">
                          {chat.isPublic === false || chat.requiresApproval
                            ? 'Добавить, дать приватную ссылку или QR-код'
                            : 'Добавить участника, дать ссылку или QR-код'}
                        </div>
                      </div>
                    </button>

                    {/* 1. Покинуть чат / канал */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowLeaveModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {chat.type === 'channel' ? 'Покинуть канал' : 'Покинуть чат'}
                        </div>
                        <div className="text-[10px] text-rose-300/70">
                          Выйти из сообщества
                        </div>
                      </div>
                    </button>

                    {/* 2. Выключить звук */}
                    <button
                      onClick={handleToggleMute}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] flex items-center gap-2.5 transition text-left cursor-pointer text-[#e1e3e6]"
                    >
                      {isMuted ? (
                        <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {isMuted ? 'Включить звук' : 'Выключить звук'}
                        </div>
                        <div className="text-[10px] text-[#828282]">
                          {isMuted ? 'Оповещения активированы' : 'Без звуковых уведомлений'}
                        </div>
                      </div>
                    </button>

                    {/* 3. Удалить чат */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {isOwnerOrAdmin ? 'Удалить сообщество' : 'Удалить у себя'}
                        </div>
                        <div className="text-[10px] text-rose-300/70">
                          {isOwnerOrAdmin ? 'Для всех участников' : 'Очистить из списка'}
                        </div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-[#2e2e32]" />

                    {/* 4. Управление сообществом */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowGroupInfoModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] text-[#71aaeb] flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Управление и участники</span>
                    </button>

                    {/* 5. Информация */}
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowChatInfoModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#2c2d2e] text-[#939393] hover:text-white flex items-center gap-2.5 transition text-left cursor-pointer"
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Информация о {chat.type === 'channel' ? 'канале' : 'группе'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTION TOAST BANNER */}
      {actionToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1e1e24] text-white text-xs px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-[#f1c40f]" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* BLOCKED WARNING BANNER */}
      {isBlocked && (
        <div className="w-full bg-rose-950/85 border-b border-rose-800/60 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200 shrink-0 z-10 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Собеседник <b>{chat.title}</b> заблокирован. Звонки и отправка сообщений ограничены.</span>
          </div>
          <button
            onClick={handleToggleBlock}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] cursor-pointer transition shadow"
          >
            Разблокировать
          </button>
        </div>
      )}

      {/* SECRET CHAT ENCRYPTION BANNER */}
      {isSecretChat && (
        <div className="w-full bg-gradient-to-r from-emerald-950/90 via-[#162725] to-emerald-950/90 border-b border-emerald-500/40 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs text-emerald-200 shrink-0 z-10 animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] truncate">
              🔒 <b>Скрытый секретный чат:</b> сквозное шифрование (не виден в общем списке).
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onHideSecretChatToNormal && (
              <button
                onClick={() => onHideSecretChatToNormal(chat.id)}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-[10px] text-emerald-200 font-semibold cursor-pointer transition"
                title="Скрыть секретный чат и вернуться к обычному диалогу"
              >
                Скрыть
              </button>
            )}
            <button
              onClick={handleEndSecretChat}
              className="px-2 py-0.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 text-[10px] text-rose-200 font-bold cursor-pointer transition"
              title="Завершить и удалить секретный чат (возврат в исходное положение)"
            >
              Завершить
            </button>
          </div>
        </div>
      )}

      {/* IN-CHAT MESSAGE SEARCH OVERLAY (ПОИСК В ПЕРЕПИСКЕ ИЛИ ВХОД В СКРЫТЫЙ ЧАТ ПО PIN) */}
      {isChatSearchOpen && (
        <div className="w-full bg-[#1c1c20] border-b border-[#2e2e2e] px-4 py-2 flex items-center gap-2 text-xs text-white shrink-0 animate-in fade-in slide-in-from-top-1 z-10">
          <Search className="w-4 h-4 text-[#71aaeb] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={hasLinkedSecretChat && !isSecretChat ? "Поиск сообщений или введите 6-значный PIN секретного чата..." : "Поиск по истории сообщений в этом чате..."}
            value={chatSearchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setChatSearchQuery(val);
              if (!isSecretChat && hasLinkedSecretChat && chat.linkedSecretPin && val.trim() === chat.linkedSecretPin && onStartOrOpenSecretChat) {
                setChatSearchQuery('');
                setIsChatSearchOpen(false);
                onStartOrOpenSecretChat(chat.id, val.trim());
              }
            }}
            className="flex-1 bg-[#141414] text-white text-xs px-3 py-1.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF] transition"
          />
          {chatSearchQuery && (
            <span className="text-[11px] text-[#828282] shrink-0 font-medium">
              Найдено: {messages.filter((m) => (m.content || '').toLowerCase().includes(chatSearchQuery.toLowerCase())).length}
            </span>
          )}
          <button
            onClick={() => {
              setIsChatSearchOpen(false);
              setChatSearchQuery('');
            }}
            className="p-1 rounded-lg text-[#828282] hover:text-white transition cursor-pointer shrink-0"
            title="Закрыть поиск"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PINNED MESSAGE BANNER (ЗАКРЕПЛЁННОЕ СООБЩЕНИЕ В ЧАТЕ) */}
      {pinnedMessage && (
        <div className="w-full bg-[#1c1c24] border-b border-[#2e2e32] px-4 py-2 flex items-center justify-between gap-3 text-xs text-[#e1e3e6] shrink-0 z-10 animate-in fade-in">
          <div
            onClick={() => {
              const el = document.getElementById(`msg_${pinnedMessage.id}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition"
            title="Нажмите, чтобы перейти к закрепленному сообщению"
          >
            <Pin className="w-3.5 h-3.5 text-[#71aaeb] shrink-0 fill-current" />
            <div className="min-w-0 flex-1 truncate text-xs">
              <span className="font-semibold text-[#71aaeb] mr-1">Закреплённое сообщение:</span>
              <span className="text-[#939393] truncate">{pinnedMessage.content || 'Медиасообщение'}</span>
            </div>
          </div>
          <button
            onClick={() => setPinnedMessage(null)}
            className="p-1 rounded-full text-[#828282] hover:text-white transition cursor-pointer shrink-0"
            title="Открепить сообщение"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. FORUM TOPICS BAR */}
      {isGroupOrChannel && (
        <div className="w-full min-w-0 max-w-full bg-[#19191a] border-b border-[#2e2e2e] flex items-center px-2 py-1.5 shrink-0 gap-1.5 text-[11px] select-none overflow-hidden">
          <button
            onClick={() => {
              if (chatTopicsRef.current) chatTopicsRef.current.scrollBy({ left: -120, behavior: 'smooth' });
            }}
            className="flex w-5 h-5 rounded-md bg-[#2c2d2e] text-[#939393] hover:text-white shrink-0 cursor-pointer items-center justify-center text-xs font-bold"
            title="Прокрутить влево"
          >
            ‹
          </button>

          <div 
            ref={chatTopicsRef}
            onWheel={(e) => {
              if (chatTopicsRef.current && e.deltaY !== 0) {
                e.preventDefault();
                chatTopicsRef.current.scrollLeft += e.deltaY;
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`w-0 flex-1 min-w-0 px-0.5 py-0.5 flex items-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [touch-action:pan-x] scrollbar-none whitespace-nowrap ${
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
          >
            <span className="text-[10px] font-medium text-[#828282] shrink-0 mr-0.5">
              Беседы:
            </span>

            {chat.topics?.map((top) => (
              <button
                key={top.id}
                onClick={() => {
                  if (!hasDraggedRef.current) {
                    setActiveTopicId(top.id);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 flex items-center gap-1 cursor-pointer ${
                  activeTopicId === top.id
                    ? 'bg-[#0077FF] text-white'
                    : 'bg-[#2c2d2e] text-[#e1e3e6] hover:bg-[#363738]'
                }`}
              >
                <span>{top.icon}</span>
                <span>{top.title}</span>
              </button>
            ))}

            <button
              onClick={() => {
                if (!hasDraggedRef.current) {
                  setIsCreateTopicOpen(true);
                }
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 flex items-center gap-1 bg-[#222222] hover:bg-[#2c2d2e] border border-[#2e2e2e] text-[#71aaeb] cursor-pointer"
            >
              {isOwnerOrAdmin ? (
                <Plus className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400" />
              )}
              <span>Создать тему</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (chatTopicsRef.current) chatTopicsRef.current.scrollBy({ left: 120, behavior: 'smooth' });
            }}
            className="flex w-5 h-5 rounded-md bg-[#2c2d2e] text-[#939393] hover:text-white shrink-0 cursor-pointer items-center justify-center text-xs font-bold"
            title="Прокрутить вправо"
          >
            ›
          </button>
        </div>
      )}

      {/* 3. MESSAGES STREAM (VKontakte Messenger Canvas) */}
      <div 
        className="w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-2.5 scrollbar-thin min-h-0 bg-[#141414] [-webkit-overflow-scrolling:touch] [touch-action:pan-y]"
      >
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 rounded-full bg-[#222222] text-[11px] font-medium text-[#828282] border border-[#2e2e2e]">
            Сегодня
          </span>
        </div>

        {/* SPECIAL GIF HUB BANNER */}
        {chat.id === 'chat_gif_hub' && showGifHubBanner && (
          <div className="p-3.5 bg-[#222222] border border-[#2e2e2e] rounded-2xl flex items-center justify-between text-xs text-[#e1e3e6] my-2 relative">
            <div className="flex items-center gap-3 pr-6">
              <span className="text-2xl">👾</span>
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>Общий GIF-каталог AuraChat</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0077FF]/20 text-[#71aaeb] font-mono">LIVE</span>
                </div>
                <div className="text-[11px] text-[#939393] leading-tight mt-0.5">
                  Отправьте любую гифку или фото сюда — они появятся у всех пользователей в комментариях с указанием вашего авторства (@{currentUser.username}).
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowGifHubBanner(false)}
              className="p-1.5 rounded-full text-[#828282] hover:text-white hover:bg-[#2c2d2e] transition cursor-pointer shrink-0"
              title="Скрыть баннер"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {displayMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;

          return (
            <div
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              onClick={() => setHoveredMessageId((prev) => (prev === msg.id ? null : msg.id))}
              className={`flex items-end gap-2 max-w-[86%] sm:max-w-[70%] min-w-0 group relative ${
                isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {!isMe && (
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 mb-1"
                />
              )}

              {/* Message Bubble Container */}
              <div className="relative min-w-0 max-w-full">
                {/* Floating Quick Action Bar (VK / Telegram / Klik-Klan style: Reactions, Reply, Pin, Forward, Copy, Delete) */}
                {hoveredMessageId === msg.id && (
                  <div className={`absolute -top-8 z-20 flex items-center gap-1 bg-[#222222] border border-[#2e2e2e] rounded-full px-2 py-0.5 shadow-xl transition animate-in fade-in zoom-in-95 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}>
                    {['❤️', '👍', '🔥', '😂', '🚀'].map((em) => (
                      <button
                        key={em}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactionClick(msg.id, em);
                        }}
                        className="text-xs sm:text-sm hover:scale-125 transition p-0.5 cursor-pointer"
                        title={`Реакция ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                    <div className="w-px h-3 bg-[#3a3b3c] mx-0.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingToMessage(msg);
                      }}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Ответить на сообщение"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPinnedMessage(msg);
                        triggerToast('📌 Сообщение закреплено вверху чата');
                      }}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Закрепить сообщение"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForwardingMessage(msg);
                      }}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Переслать сообщение"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {msg.content && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(msg.content);
                            triggerToast('📋 Текст скопирован в буфер');
                          }
                        }}
                        className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                        title="Скопировать текст сообщения"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMessage) {
                          onDeleteMessage(chat.id, msg.id, true);
                          triggerToast('🗑 Сообщение удалено у всех');
                        }
                      }}
                      className="p-1 text-[#e64646] hover:text-[#ff6b6b] transition cursor-pointer"
                      title="Удалить сообщение у всех"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* The Message Bubble */}
                <div
                  id={`msg_${msg.id}`}
                  className={`p-2.5 sm:p-3 rounded-2xl relative text-xs leading-relaxed transition break-words [overflow-wrap:anywhere] max-w-full overflow-hidden ${
                    isMe
                      ? 'bg-[#2b5278] text-white rounded-br-sm'
                      : 'bg-[#222222] text-[#e1e3e6] rounded-bl-sm border border-[#2e2e2e]'
                  }`}
                >
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#71aaeb] text-[11px] truncate">
                        {msg.senderName}
                      </span>
                    </div>
                  )}

                  {/* QUOTED REPLY CARD (ВК / TELEGRAM ЦИТАТА ОТВЕТА) */}
                  {msg.mediaMeta?.replyTo && (
                    <div className="mb-2 p-2 rounded-xl bg-black/30 border-l-2 border-[#71aaeb] text-[11px] select-none">
                      <div className="font-semibold text-[#71aaeb] text-[10px] truncate">
                        {msg.mediaMeta.replyTo.senderName}
                      </div>
                      <div className="text-[#e1e3e6] truncate opacity-90 text-[11px] mt-0.5">
                        {msg.mediaMeta.replyTo.content}
                      </div>
                    </div>
                  )}

                  {/* TEXT */}
                  {msg.type === 'text' && (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                  )}

                  {/* VOICE MEMO */}
                  {msg.type === 'voice' && (
                    <div className="flex items-center gap-2 py-1 w-full min-w-[130px] sm:min-w-[180px] max-w-[240px]">
                      <button
                        onClick={() => handleToggleVoice(msg.id, msg.mediaMeta?.durationSec || 8, msg.mediaUrl || msg.mediaMeta?.mediaUrl)}
                        className="p-2 sm:p-2.5 rounded-full bg-[#0077FF] text-white hover:bg-[#0066DD] transition cursor-pointer shrink-0"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 flex items-center gap-0.5 h-6 min-w-0">
                        {(msg.mediaMeta?.waveform || [30, 60, 45, 80, 100, 75, 40, 90, 50, 70, 30]).map((h, i) => {
                          const isPlayed = (audioProgressMap[msg.id] || 0) > (i / 11) * 100;
                          return (
                            <span
                              key={i}
                              style={{ height: `${Math.max(4, h * 0.22)}px` }}
                              className={`w-1 rounded-full transition-all ${
                                isPlayed
                                  ? 'bg-[#71aaeb]'
                                  : playingAudioId === msg.id
                                  ? 'bg-white/80'
                                  : 'bg-[#828282]/60'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <span className="text-[10px] font-mono text-[#939393] shrink-0">
                        {playingAudioId === msg.id
                          ? `0:0${Math.floor(((audioProgressMap[msg.id] || 0) / 100) * (msg.mediaMeta?.durationSec || 8))}`
                          : `0:0${msg.mediaMeta?.durationSec || 8}`}
                      </span>
                    </div>
                  )}

                  {/* ROUND VIDEO NOTE (КРУЖОЧЕК С РЕАЛЬНЫМ ВИДЕО И ЗВУКОМ) */}
                  {msg.type === 'video_note' && (() => {
                    const url = msg.mediaUrl || '';
                    const isRealVideo =
                      url.startsWith('data:video/') ||
                      url.startsWith('blob:') ||
                      /\.(mp4|webm|ogg|mov)$/i.test(url);

                    return (
                      <div className="py-1">
                        <div 
                          onClick={() => handleToggleVideoNote(msg.id)}
                          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-2 relative mx-auto bg-black cursor-pointer group transition-all ${
                            playingVideoNoteId === msg.id
                              ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.45)] scale-[1.03]'
                              : 'border-[#0077FF]'
                          }`}
                        >
                          {isRealVideo ? (
                            <video
                              ref={(el) => {
                                videoNoteRefs.current[msg.id] = el;
                              }}
                              src={url}
                              playsInline
                              muted={playingVideoNoteId !== msg.id}
                              loop={false}
                              onEnded={() => setPlayingVideoNoteId(null)}
                              className="w-full h-full object-cover -scale-x-100"
                            />
                          ) : (
                            <img
                              src={msg.mediaUrl || msg.senderAvatar}
                              alt="Видеосообщение"
                              className="w-full h-full object-cover"
                            />
                          )}

                          {playingVideoNoteId !== msg.id && (
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/25 transition">
                              <div className="p-3 rounded-full bg-[#0077FF]/90 text-white shadow-lg">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </div>
                            </div>
                          )}

                          <div className="absolute bottom-2 inset-x-0 flex justify-center">
                            <span className="text-[9px] font-mono text-white bg-black/75 px-2.5 py-0.5 rounded-full">
                              {playingVideoNoteId === msg.id
                                ? '🔊 Звук ВКЛ'
                                : `00:${(msg.mediaMeta?.durationSec || 7).toString().padStart(2, '0')}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-1.5">
                          <span className="text-[10px] text-[#71aaeb] font-medium">
                            {playingVideoNoteId === msg.id ? 'Воспроизведение со звуком...' : 'Кружочек (нажмите для звука)'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadMediaFile(msg.mediaUrl || msg.senderAvatar, `aurachat_video_note_${msg.id}`, 'video');
                            }}
                            className="px-2 py-0.5 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer transition"
                            title="Скачать кружочек"
                          >
                            <Download className="w-3 h-3" />
                            <span>Скачать</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PHOTO / VIDEO / CUSTOM STICKER ATTACHMENT */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    msg.mediaMeta?.isSticker ? (
                      <div className="py-1 flex flex-col items-center">
                        <img
                          src={msg.mediaUrl}
                          alt={msg.content || 'Стикер'}
                          onClick={() => {
                            if (msg.mediaMeta?.stickerPackName) {
                              const found = stickerPacks.find((p) => p.name === msg.mediaMeta?.stickerPackName || p.id === msg.mediaMeta?.stickerPackId);
                              const packObj: CustomStickerPack = found || {
                                id: msg.mediaMeta.stickerPackId || 'pack_shared_' + msg.id,
                                name: msg.mediaMeta.stickerPackName,
                                coverUrl: msg.mediaMeta.stickerPackCover || msg.mediaUrl,
                                stickers: msg.mediaMeta.stickerPackItems?.length
                                  ? msg.mediaMeta.stickerPackItems.map((s) => ({ id: s.id, url: s.url, title: s.title, createdAt: Date.now() }))
                                  : [{ id: 'stk_' + msg.id, url: msg.mediaUrl!, title: msg.content || 'Стикер', createdAt: Date.now() }]
                              };
                              const isSaved = stickerPacks.some((p) => p.name.toLowerCase() === packObj.name.toLowerCase());
                              setViewingPackModal({ pack: packObj, isSaved });
                            } else {
                              setLightboxImage(msg.mediaUrl!);
                            }
                          }}
                          className="w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] cursor-pointer hover:scale-105 transition-transform"
                          title="Нажмите, чтобы открыть пак стикеров и сохранить себе"
                        />
                        {msg.mediaMeta?.stickerPackName && (
                          <button
                            type="button"
                            onClick={() => {
                              const found = stickerPacks.find((p) => p.name === msg.mediaMeta?.stickerPackName || p.id === msg.mediaMeta?.stickerPackId);
                              const packObj: CustomStickerPack = found || {
                                id: msg.mediaMeta?.stickerPackId || 'pack_shared_' + msg.id,
                                name: msg.mediaMeta!.stickerPackName!,
                                coverUrl: msg.mediaMeta?.stickerPackCover || msg.mediaUrl,
                                stickers: msg.mediaMeta?.stickerPackItems?.length
                                  ? msg.mediaMeta.stickerPackItems.map((s) => ({ id: s.id, url: s.url, title: s.title, createdAt: Date.now() }))
                                  : [{ id: 'stk_' + msg.id, url: msg.mediaUrl!, title: msg.content || 'Стикер', createdAt: Date.now() }]
                              };
                              const isSaved = stickerPacks.some((p) => p.name.toLowerCase() === packObj.name.toLowerCase());
                              setViewingPackModal({ pack: packObj, isSaved });
                            }}
                            className="mt-1 px-2.5 py-1 rounded-full bg-[#0077FF]/20 hover:bg-[#0077FF]/35 text-[#71aaeb] hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition border border-[#0077FF]/30"
                            title="Открыть пак и сохранить в свою подборку"
                          >
                            <Sparkles className="w-3 h-3 text-[#71aaeb]" />
                            <span>Пак «{msg.mediaMeta.stickerPackName}» · Открыть</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-1 relative group/img space-y-1.5">
                        {msg.mediaUrl.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(msg.mediaUrl) || msg.mediaMeta?.isVideo ? (
                          <video
                            src={msg.mediaUrl}
                            controls
                            playsInline
                            className="max-h-64 rounded-xl bg-black object-contain w-full"
                          />
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            alt="Вложение"
                            onClick={() => setLightboxImage(msg.mediaUrl!)}
                            className="max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                          />
                        )}

                        {/* Подпись (надпись) к картинке или видео */}
                        {msg.content &&
                          msg.content !== 'Фотография' &&
                          msg.content !== 'Видеозапись' && (
                            <p className="text-xs sm:text-[13px] text-white whitespace-pre-wrap break-words leading-relaxed pt-0.5">
                              {msg.content}
                            </p>
                          )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const isVid = msg.mediaUrl!.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(msg.mediaUrl!) || msg.mediaMeta?.isVideo;
                            downloadMediaFile(msg.mediaUrl!, `aurachat_media_${msg.id}`, isVid ? 'video' : 'image');
                          }}
                          className="mt-1 px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition w-fit"
                          title="Скачать медиафайл"
                        >
                          <Download className="w-3 h-3" />
                          <span>Скачать</span>
                        </button>
                      </div>
                    )
                  )}

                  {/* AUDIO / MUSIC ATTACHMENT */}
                  {(msg.type === 'audio' || (msg.type === 'file' && msg.mediaMeta?.title)) && (
                    <div className="py-1 w-full min-w-[150px] sm:min-w-[200px] max-w-[260px] space-y-2">
                      <div className="flex items-center gap-2.5 bg-[#19191a] p-2 sm:p-2.5 rounded-xl border border-[#2e2e2e]">
                        <button
                          type="button"
                          onClick={() => handleToggleMusicMessage(msg)}
                          className="p-2.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white transition cursor-pointer shrink-0"
                          title={playingMusicMsgId === msg.id ? "Пауза" : "Воспроизвести"}
                        >
                          {playingMusicMsgId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-white truncate">
                            {msg.mediaMeta?.title || msg.content || 'Аудиозапись'}
                          </div>
                          <div className="text-[10px] text-[#939393] truncate">
                            {msg.mediaMeta?.artist || 'Исполнитель'}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0077FF]/20 text-[#71aaeb]">
                              {msg.mediaMeta?.trimmedLengthSec ? `${msg.mediaMeta.trimmedLengthSec} сек` : 'AuraChat Музыка'}
                            </span>
                            <span className="text-[9px] font-mono text-[#828282]">
                              {msg.mediaMeta?.durationSec ? `00:${msg.mediaMeta.durationSec < 10 ? '0' : ''}${msg.mediaMeta.durationSec}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & checkmarks: 1 галочка если отправлено и не прочитано, 2 галочки если собеседник зашёл и прочитал */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#939393]">
                    <span>{formatSmartTime(msg.createdAt, msg.id, nowTick)}</span>
                    {isMe && (
                      chat.type === 'saved' || msg.status === 'read' ? (
                        <span title="Прочитано собеседником">
                          <CheckCheck className="w-3.5 h-3.5 text-[#71aaeb]" />
                        </span>
                      ) : (
                        <span title="Отправлено (собеседник ещё не зашёл в чат)">
                          <Check className="w-3.5 h-3.5 text-[#939393]" />
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Reaction Badges below bubble */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleReactionClick(msg.id, r.emoji)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition cursor-pointer ${
                          r.userReacted
                            ? 'bg-[#0077FF]/20 border-[#0077FF] text-white'
                            : 'bg-[#222222] border-[#2e2e2e] text-[#e1e3e6] hover:bg-[#2c2d2e]'
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-semibold">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. MESSAGE INPUT BAR (VKontakte Messenger Composer) */}
      {isBlocked ? (
        <div className="w-full min-w-0 max-w-full p-3.5 bg-[#1b1b1e] border-t border-rose-900/40 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-rose-300 min-w-0 flex-1 truncate">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">Собеседник заблокирован. Вы не можете отправлять сообщения.</span>
          </div>
          <button
            onClick={handleToggleBlock}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition cursor-pointer shadow"
          >
            Разблокировать
          </button>
        </div>
      ) : chat.type === 'channel' && !isOwnerOrAdmin ? (
        <div className="w-full min-w-0 max-w-full p-2.5 bg-[#222222] border-t border-[#2e2e2e] flex items-center justify-center text-xs text-[#828282] shrink-0">
          <Lock className="w-3.5 h-3.5 mr-1.5 text-[#828282] shrink-0" />
          <span className="truncate">Только администраторы могут публиковать записи в этом канале</span>
        </div>
      ) : (
        <div className="w-full flex flex-col shrink-0">
          {/* QUOTED REPLY PREVIEW BAR (ВК ПРЕВЬЮ ОТВЕТА НА СООБЩЕНИЕ) */}
          {replyingToMessage && (
            <div className="w-full bg-[#1c1c20] border-t border-[#2e2e2e] px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs text-[#e1e3e6] shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                <CornerUpLeft className="w-4 h-4 text-[#71aaeb] shrink-0" />
                <div className="min-w-0 flex-1 truncate text-xs">
                  <span className="font-semibold text-[#71aaeb] mr-1">Ответ пользователю {replyingToMessage.senderName}:</span>
                  <span className="text-[#939393] truncate">{replyingToMessage.content || 'Медиасообщение'}</span>
                </div>
              </div>
              <button
                onClick={() => setReplyingToMessage(null)}
                className="p-1 rounded-full text-[#828282] hover:text-white transition cursor-pointer shrink-0"
                title="Отменить ответ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="w-full min-w-0 max-w-full px-2 sm:px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] bg-[#222222] border-t border-[#2e2e2e] flex items-center gap-1 sm:gap-1.5 shrink-0 relative overflow-visible">
          {/* Floating Emoji & Custom Stickers Picker Popover */}
          {showEmojiPicker && (() => {
            const activePack = stickerPacks.find((p) => p.id === activeStickerPackId) || stickerPacks[0];
            return (
              <div className="absolute bottom-14 right-2 sm:right-6 bg-[#1c1c20] border border-[#333338] rounded-2xl p-3 shadow-2xl z-40 w-72 sm:w-80 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Top Mode Switcher: Стикеры | Эмодзи */}
                <div className="flex items-center justify-between gap-1 bg-[#141416] p-1 rounded-xl border border-[#2a2a2e]">
                  <button
                    type="button"
                    onClick={() => setPickerTab('stickers')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      pickerTab === 'stickers'
                        ? 'bg-[#0077FF] text-white shadow'
                        : 'text-[#939393] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Стикеры</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab('emojis')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      pickerTab === 'emojis'
                        ? 'bg-[#0077FF] text-white shadow'
                        : 'text-[#939393] hover:text-white'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Эмодзи</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1.5 rounded-lg text-[#828282] hover:text-white cursor-pointer"
                    title="Закрыть"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {pickerTab === 'emojis' ? (
                  <div className="grid grid-cols-6 gap-1 pt-0.5">
                    {quickEmojis.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setInputText((prev) => prev + em);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg sm:text-xl p-1.5 rounded-xl hover:bg-[#2c2d2e] transition cursor-pointer flex items-center justify-center"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Sticker Packs Tabs + "+ Пак" button */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#2c2d2e]">
                      {stickerPacks.map((pack) => (
                        <button
                          key={pack.id}
                          type="button"
                          onClick={() => setActiveStickerPackId(pack.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition cursor-pointer ${
                            activePack?.id === pack.id
                              ? 'bg-[#2c2d2e] text-[#71aaeb] border border-[#0077FF]/50'
                              : 'text-[#939393] hover:text-white hover:bg-[#252528]'
                          }`}
                        >
                          {pack.name} ({pack.stickers.length})
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsCreatePackModalOpen(true)}
                        className="px-2 py-1 rounded-lg bg-[#0077FF]/20 hover:bg-[#0077FF]/30 text-[#71aaeb] border border-[#0077FF]/40 text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition"
                        title="Создать новый пак самодельных стикеров"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Пак</span>
                      </button>
                    </div>

                    {/* Active Pack Action Bar: Copy Link, Send Pack into Chat, and Max 70 indicator */}
                    {activePack && (
                      <div className="flex items-center justify-between gap-1.5 px-1 py-1 rounded-xl bg-[#25252a] border border-[#333338] text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {activePack.coverUrl && (
                            <img
                              src={activePack.coverUrl}
                              alt={activePack.name}
                              className="w-5 h-5 rounded-md object-contain shrink-0 bg-black/40"
                            />
                          )}
                          <div className="truncate text-white font-bold">
                            {activePack.name}
                            <span className="text-[#939393] font-normal ml-1">
                              ({activePack.stickers.length}/70)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyStickerPackLink(activePack)}
                            className="p-1 px-1.5 rounded-lg bg-[#303036] hover:bg-[#3d3d44] text-[#71aaeb] hover:text-white transition flex items-center gap-1 cursor-pointer"
                            title="Скопировать ссылку на этот стикерпак"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Ссылка</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendStickerPackIntoChat(activePack)}
                            className="p-1 px-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white transition flex items-center gap-1 cursor-pointer font-bold"
                            title="Отправить весь стикерпак в чат, чтобы собеседник мог его себе сохранить"
                          >
                            <Send className="w-3 h-3" />
                            <span>В чат</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveStickerPackFromCollection(activePack)}
                            className="p-1 px-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 transition flex items-center gap-1 cursor-pointer"
                            title="Удалить этот пак из подборки"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stickers Grid with "+" Button to Add Custom Sticker */}
                    <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-0.5 scrollbar-thin">
                      {/* "+" Tile: Add Custom Sticker to current pack */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewStickerRawImage('');
                          setNewStickerCaption('');
                          setIsAddStickerModalOpen(true);
                        }}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#0077FF]/60 bg-[#0077FF]/10 hover:bg-[#0077FF]/20 text-[#71aaeb] flex flex-col items-center justify-center gap-1 p-2 transition cursor-pointer group"
                        title="Добавить свой самодельный стикер в этот пак"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0077FF] text-white flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight">
                          + Стикер
                        </span>
                      </button>

                      {activePack?.stickers.map((stk) => (
                        <div
                          key={stk.id}
                          className="relative aspect-square rounded-xl bg-[#252529] hover:bg-[#2f2f35] border border-[#333338] p-1.5 flex flex-col items-center justify-center cursor-pointer group transition"
                          onClick={() => handleSendSticker(stk, activePack.name)}
                          title={stk.title ? `Отправить стикер «${stk.title}»` : 'Отправить стикер'}
                        >
                          <img
                            src={stk.url}
                            alt={stk.title || 'Стикер'}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStickerPacks((prev) =>
                                prev.map((p) =>
                                  p.id === activePack.id
                                    ? { ...p, stickers: p.stickers.filter((s) => s.id !== stk.id) }
                                    : p
                                )
                              );
                            }}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                            title="Удалить стикер"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <label
            className="p-1.5 text-[#828282] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
            title="Прикрепить картинку и надпись перед отправкой (или видео/аудио)"
          >
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.type.startsWith('audio/')) {
                    handleAudioFileSelected(f);
                  } else {
                    const isVideoFile = f.type.startsWith('video/');
                    const { url } = await fileToPersistentUrl(f);
                    playReactionSound();
                    // Сначала показываем картинку и поле для надписи, и только потом отправляем!
                    setPendingMediaAttachment({
                      url,
                      isVideo: isVideoFile,
                      fileName: f.name
                    });
                    setPendingMediaCaption(inputText);
                  }
                  e.target.value = '';
                }
              }}
            />
          </label>

          {/* Music Button — hidden on narrow screens since Paperclip handles audio */}
          <label
            className="hidden sm:flex p-1.5 text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
            title="Прикрепить аудиозапись"
          >
            <Music className="w-4 h-4" />
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  handleAudioFileSelected(f);
                  e.target.value = '';
                }
              }}
            />
          </label>

          <input
            type="text"
            placeholder={
              chat.type === 'channel'
                ? '📢 Опубликовать запись в канале...'
                : chat.type === 'group'
                ? 'Написать сообщение в группу...'
                : 'Напишите сообщение...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-0 min-w-0 flex-1 bg-[#2c2d2e] text-white text-xs sm:text-sm rounded-lg px-3 py-2 outline-none placeholder-[#828282] border border-transparent focus:border-[#0077FF] transition"
          />

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
              showEmojiPicker ? 'text-[#0077FF] bg-[#2c2d2e]' : 'text-[#828282] hover:text-white'
            }`}
            title="Эмодзи и стикеры"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Mobile & Desktop adaptive Send / Voice / Video buttons */}
          {inputText.trim() ? (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Video Note Button («Кружочек») */}
              <button
                type="button"
                onClick={onOpenVideoNoteRecorder}
                className="flex items-center justify-center p-1.5 text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
                title="Записать видеокружок (круглое видеосообщение)"
              >
                <Disc className="w-4 h-4 text-[#71aaeb]" />
              </button>

              <button
                type="button"
                onClick={handleSend}
                className="p-2 bg-[#0077FF] hover:bg-[#0066DD] text-white rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center"
                title="Отправить сообщение (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Video Note Button («Кружочек» — доступен всегда на телефонах и компьютерах) */}
              <button
                type="button"
                onClick={onOpenVideoNoteRecorder}
                className="flex items-center justify-center p-1.5 text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0 relative group"
                title="Записать кружочек (видеосообщение)"
              >
                <Disc className="w-4 h-4 text-[#71aaeb] group-hover:scale-110 transition-transform" />
              </button>

              {/* Voice Note Button */}
              <button
                type="button"
                onClick={() => setIsVoiceStudioOpen(true)}
                onMouseDown={() => setIsVoiceStudioOpen(true)}
                className="p-1.5 text-[#828282] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center"
                title="Голосовое сообщение"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* VOICE RECORDING STUDIO MODAL (RECORD, PREVIEW, TRIM, REDO, SEND) */}
      <VoiceRecorderStudioModal
        isOpen={isVoiceStudioOpen}
        onClose={() => setIsVoiceStudioOpen(false)}
        onSendVoice={(durationSec, waveform, audioUrl) => {
          onSendMessage('voice', 'Голосовое сообщение', audioUrl, {
            durationSec,
            waveform,
            mediaUrl: audioUrl,
            topicId: activeTopicId || undefined
          });
        }}
      />

      {/* AUDIO / MUSIC TRIMMER MODAL (ATTACH FROM DEVICE WITH 15s / 30s / 60s / FULL PRESETS) */}
      <AudioTrimmerModal
        isOpen={isAudioTrimmerOpen}
        file={pendingAudioFile}
        onClose={() => {
          setIsAudioTrimmerOpen(false);
          setPendingAudioFile(null);
        }}
        onConfirm={handleConfirmTrimmedAudio}
      />

      {/* 5. CREATE TOPIC MODAL */}
      <CreateTopicModal
        isOpen={isCreateTopicOpen}
        onClose={() => setIsCreateTopicOpen(false)}
        userRole={userRole}
        chatTitle={chat.title}
        onCreateTopic={(title, icon) => {
          if (onCreateTopic) onCreateTopic(chat.id, title, icon);
        }}
      />

      {/* 5.1. INVITE LINK, QR CODE & ADD PERSON MODAL */}
      <InviteAndQRModal
        isOpen={isInviteAndQROpen}
        chat={chat}
        allUsers={savedAccounts}
        currentUserId={currentUser.id}
        onClose={() => setIsInviteAndQROpen(false)}
        onAddMemberToChat={(chatId, targetUser) => {
          const currentMembers = chat.members || [];
          const alreadyExists = currentMembers.some(
            (m) =>
              m.userId === targetUser.id ||
              (m.username && targetUser.username && m.username.toLowerCase() === targetUser.username.toLowerCase())
          );
          if (!alreadyExists) {
            const nextMembers = [
              ...currentMembers,
              {
                userId: targetUser.id,
                displayName: targetUser.displayName,
                username: targetUser.username,
                avatarUrl: targetUser.avatarUrl,
                role: 'member' as const,
                joinedAt: 'Только что'
              }
            ];
            onUpdateChat?.({
              ...chat,
              members: nextMembers,
              membersCount: Math.max((chat.membersCount || 1) + 1, nextMembers.length)
            });
          }
          triggerToast(`✅ Пользователь ${targetUser.displayName} добавлен!`);
        }}
      />

      {/* 5.1b. PRE-SEND IMAGE / VIDEO + CAPTION MODAL ("КАРТИНКА И НАДПИСЬ ПЕРЕД ОТПРАВКОЙ") */}
      {pendingMediaAttachment && (
        <div
          className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            setPendingMediaAttachment(null);
            setPendingMediaCaption('');
          }}
        >
          <div
            className="bg-[#1c1c20] border border-[#333338] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0077FF]/20 text-[#71aaeb]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {chat.type === 'channel' ? 'Публикация в канал' : 'Отправка медиафайла'}
                  </h3>
                  <p className="text-[11px] text-[#939393]">
                    Проверьте картинку и добавьте надпись перед отправкой
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingMediaAttachment(null);
                  setPendingMediaCaption('');
                }}
                className="p-1.5 rounded-xl bg-[#2c2d2e] text-[#939393] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image / Video Preview */}
            <div className="rounded-2xl overflow-hidden bg-[#121214] border border-[#2e2e32] flex items-center justify-center max-h-72 relative">
              {pendingMediaAttachment.isVideo ? (
                <video
                  src={pendingMediaAttachment.url}
                  controls
                  playsInline
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <img
                  src={pendingMediaAttachment.url}
                  alt="Предпросмотр"
                  className="max-h-72 w-full object-contain"
                />
              )}
              <label
                className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-[#0077FF] text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer border border-white/15 transition"
                title="Заменить картинку"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Заменить</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const isVid = f.type.startsWith('video/');
                      const { url } = await fileToPersistentUrl(f);
                      setPendingMediaAttachment({ url, isVideo: isVid, fileName: f.name });
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>

            {/* Caption Input ("Надпись") */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#939393] block">
                Надпись к картинке:
              </label>
              <textarea
                autoFocus
                rows={2}
                value={pendingMediaCaption}
                onChange={(e) => setPendingMediaCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirmSendPendingMedia();
                  }
                }}
                placeholder="Добавьте надпись к картинке..."
                className="w-full bg-[#252529] border border-[#34343a] focus:border-[#0077FF] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none placeholder-[#828282] resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPendingMediaAttachment(null);
                  setPendingMediaCaption('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-bold cursor-pointer transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmSendPendingMedia}
                className="flex-1 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{chat.type === 'channel' ? 'Опубликовать' : 'Отправить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.1c. CREATE CUSTOM STICKER PACK MODAL ("+ ПАК СТИКЕРОВ") */}
      {isCreatePackModalOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsCreatePackModalOpen(false)}
        >
          <div
            className="bg-[#1c1c20] border border-[#333338] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#71aaeb]" />
                <span>Новый пак стикеров</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePackModalOpen(false)}
                className="p-1 rounded-lg text-[#939393] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#939393] block mb-1">
                  1. Название пака:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newStickerPackName}
                  onChange={(e) => setNewStickerPackName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateStickerPack()}
                  placeholder="Например: Любимые мемы, Котята..."
                  className="w-full bg-[#252529] border border-[#34343a] focus:border-[#0077FF] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none placeholder-[#828282]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#939393] block mb-1">
                  2. Главный стикер (обложка пака):
                </label>
                {newStickerPackCover ? (
                  <div className="relative w-28 h-28 mx-auto rounded-2xl bg-[#141416] border border-[#0077FF]/50 p-2 flex items-center justify-center">
                    <img
                      src={newStickerPackCover}
                      alt="Обложка"
                      className="w-full h-full object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setNewStickerPackCover('')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-24 rounded-2xl border-2 border-dashed border-[#0077FF]/50 bg-[#0077FF]/10 hover:bg-[#0077FF]/15 flex flex-col items-center justify-center gap-1 cursor-pointer transition p-2 text-center">
                    <div className="w-7 h-7 rounded-full bg-[#0077FF] text-white flex items-center justify-center shadow">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-white">Выбрать главный стикер</span>
                    <span className="text-[9px] text-[#939393]">Картинка станет аватаркой и стикером #1</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const { url } = await fileToPersistentUrl(f);
                          setNewStickerPackCover(url);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-[#25252a] text-[10px] text-[#71aaeb] leading-relaxed border border-[#303036]">
                ℹ️ В созданный пак можно добавить до 70 самодельных стикеров. Вы сможете отправить пак в чат или поделиться ссылкой!
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatePackModalOpen(false);
                  setNewStickerPackCover('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#2c2d2e] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!newStickerPackName.trim()}
                onClick={handleCreateStickerPack}
                className="flex-1 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-xs font-bold text-white cursor-pointer shadow-lg"
              >
                Создать пак (до 70 шт.)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.1d. ADD CUSTOM STICKER MODAL ("+ ДОБАВИТЬ САМОДЕЛЬНЫЙ СТИКЕР") */}
      {isAddStickerModalOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsAddStickerModalOpen(false)}
        >
          <div
            className="bg-[#1c1c20] border border-[#333338] rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#71aaeb]" />
                <span>Создать самодельный стикер</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStickerModalOpen(false)}
                className="p-1 rounded-lg text-[#939393] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newStickerRawImage ? (
              <div className="relative w-44 h-44 mx-auto rounded-2xl bg-[#141416] border border-[#2e2e32] flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={newStickerRawImage}
                  alt="Стикер"
                  className="w-full h-full object-contain rounded-xl"
                />
                {newStickerCaption.trim() && (
                  <div className="absolute bottom-2.5 inset-x-2 text-center font-black text-white text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
                    {newStickerCaption}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setNewStickerRawImage('')}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="w-full h-40 rounded-2xl border-2 border-dashed border-[#0077FF]/50 bg-[#0077FF]/10 hover:bg-[#0077FF]/15 flex flex-col items-center justify-center gap-2 cursor-pointer transition p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#0077FF] text-white flex items-center justify-center shadow">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">Загрузить картинку для стикера</div>
                <div className="text-[10px] text-[#939393]">PNG, JPG, WEBP или GIF с устройства</div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const { url } = await fileToPersistentUrl(f);
                      setNewStickerRawImage(url);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#939393] block">
                Надпись на стикере (необязательно):
              </label>
              <input
                type="text"
                value={newStickerCaption}
                onChange={(e) => setNewStickerCaption(e.target.value)}
                placeholder="Например: ТОП, ПРИВЕТ, ОГОНЬ..."
                className="w-full bg-[#252529] border border-[#34343a] focus:border-[#0077FF] rounded-xl px-3.5 py-2 text-xs text-white outline-none placeholder-[#828282]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddStickerModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#2c2d2e] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!newStickerRawImage}
                onClick={handleSaveCustomSticker}
                className="flex-1 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-xs font-bold text-white cursor-pointer shadow-lg"
              >
                Добавить в пак
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.1e. VIEW & SAVE STICKER PACK MODAL (ОТКРЫТЬ И СОХРАНИТЬ ПАК СТИКЕРОВ) */}
      {viewingPackModal && (
        <div
          className="fixed inset-0 z-[96] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingPackModal(null)}
        >
          <div
            className="bg-[#1c1c20] border border-[#333338] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 text-white max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2e2e34] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {viewingPackModal.pack.coverUrl && (
                  <img
                    src={viewingPackModal.pack.coverUrl}
                    alt={viewingPackModal.pack.name}
                    className="w-10 h-10 rounded-xl object-contain bg-[#121214] border border-[#0077FF]/40 p-1 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">
                    {viewingPackModal.pack.name}
                  </h3>
                  <p className="text-[11px] text-[#71aaeb]">
                    {viewingPackModal.pack.stickers.length} стикеров (макс. 70)
                    {viewingPackModal.pack.authorName ? ` · Автор: ${viewingPackModal.pack.authorName}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPackModal(null)}
                className="p-1.5 rounded-xl bg-[#25252a] text-[#939393] hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stickers Grid */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin grid grid-cols-3 sm:grid-cols-4 gap-2 min-h-36">
              {viewingPackModal.pack.stickers.map((stk) => (
                <div
                  key={stk.id}
                  onClick={() => {
                    handleSendSticker(stk, viewingPackModal.pack.name);
                    setViewingPackModal(null);
                  }}
                  className="aspect-square rounded-xl bg-[#252529] hover:bg-[#2e2e34] border border-[#333338] hover:border-[#0077FF] p-1.5 flex flex-col items-center justify-center cursor-pointer transition group"
                  title={stk.title ? `Отправить стикер «${stk.title}»` : 'Нажмите, чтобы отправить этот стикер'}
                >
                  <img
                    src={stk.url}
                    alt={stk.title || 'Стикер'}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  />
                  {stk.title && (
                    <span className="text-[9px] text-[#939393] truncate w-full text-center mt-0.5">
                      {stk.title}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions: Share Link & Install / Remove Pack Buttons */}
            <div className="pt-2 border-t border-[#2e2e34] flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyStickerPackLink(viewingPackModal.pack)}
                className="py-2.5 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#71aaeb] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                title="Поделиться ссылкой на этот стикерпак"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Ссылка</span>
              </button>

              {viewingPackModal.isSaved ? (
                <button
                  type="button"
                  onClick={() => handleRemoveStickerPackFromCollection(viewingPackModal.pack)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                  title="Нажмите, чтобы удалить этот пак из своей подборки"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Удалить из подборки</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveStickerPackToCollection(viewingPackModal.pack)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-lg bg-[#0077FF] hover:bg-[#0066DD] text-white"
                  title="Установить этот пак стикеров себе"
                >
                  <Plus className="w-4 h-4" />
                  <span>Установить</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5.3. UNIFIED CHAT INFO & PROFILE MODAL (MATCHING USER SKETCH FOR DM, GROUP, CHANNEL) */}
      <ChatInfoModal
        isOpen={showChatInfoModal}
        chat={chat}
        messages={messages}
        currentUser={currentUser}
        onClose={() => setShowChatInfoModal(false)}
        onStartCall={onStartCall}
        onOpenUserProfile={onOpenUserProfile}
        onOpenCommunityFeed={onOpenCommunityFeed}
        onDeleteChatHistory={onDeleteChatHistory}
        onOpenSearch={() => setIsChatSearchOpen(true)}
        onOpenSecretChat={() => handleOpenSecretPinModal(hasLinkedSecretChat ? 'unlock' : 'create')}
        onEndSecretChat={handleEndSecretChat}
      />

      {/* 6. CHANNEL & GROUP MANAGEMENT MODAL */}
      <ChannelManagementModal
        isOpen={showGroupInfoModal}
        chat={chat}
        messages={messages}
        currentUser={currentUser}
        userRole={userRole}
        onChangeUserRole={(role) => setUserRole(role)}
        onUpdateChat={(updatedChat) => {
          onUpdateChat?.(updatedChat);
        }}
        onClose={() => setShowGroupInfoModal(false)}
      />

      {/* 7. IMAGE LIGHTBOX MODAL WITH DOWNLOAD BUTTON */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
        >
          <div className="relative max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="" className="max-h-[82vh] rounded-2xl object-contain shadow-2xl" />
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => downloadMediaFile(lightboxImage, `aurachat_photo_${Date.now()}`, 'image')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                <span>Скачать фото</span>
              </button>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 rounded-xl bg-[#1e2a38] hover:bg-[#283748] text-white text-xs font-bold cursor-pointer"
              >
                Закрыть
              </button>
            </div>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 p-2 rounded-full bg-[#1e2a38] text-white shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 8. SECRET CHAT 6-DIGIT PIN CREATION MODAL */}
      {showSecretPinModal && (
        <div 
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => {
            setShowSecretPinModal(false);
            setPinKeypadInput('');
            setPinKeypadError('');
          }}
        >
          <div 
            className="bg-[#1a1829] border border-[#373258] rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {pinModalMode === 'unlock'
                  ? 'Вход в Скрытый Секретный Чат'
                  : 'Создание Скрытого Секретного Чата'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {pinModalMode === 'unlock' ? (
                  <>
                    Введите ваш <b className="text-emerald-400">6-значный PIN-код</b>, чтобы открыть скрытый секретный чат с «{chat.title}».
                  </>
                ) : (
                  <>
                    Придумайте <b className="text-emerald-400">6-значный цифровой код</b>. Появится новый скрытый чат с «{chat.title}» (не виден в общем списке, при завершении полностью удаляется).
                  </>
                )}
              </p>
            </div>

            {/* 6 Dots Indicator */}
            <div className="flex items-center justify-center gap-3 py-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pinKeypadInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                      isFilled
                        ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                        : 'bg-[#252146] border-[#3d376c]'
                    }`}
                  />
                );
              })}
            </div>

            {pinKeypadError && (
              <div className="text-xs text-rose-400 font-medium">
                {pinKeypadError}
              </div>
            )}

            {/* Interactive Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    playReactionSound();
                    setPinKeypadError('');
                    if (btn === 'C') {
                      setPinKeypadInput('');
                    } else if (btn === '⌫') {
                      setPinKeypadInput((prev) => prev.slice(0, -1));
                    } else {
                      if (pinKeypadInput.length < 6) {
                        const next = pinKeypadInput + btn;
                        setPinKeypadInput(next);
                        if (next.length === 6) {
                          handleConfirmSecretPin(next);
                        }
                      }
                    }
                  }}
                  className={`h-11 rounded-2xl font-bold text-sm transition cursor-pointer select-none active:scale-95 flex items-center justify-center ${
                    btn === 'C'
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                      : btn === '⌫'
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                      : 'bg-[#292447] hover:bg-[#342f5c] text-white text-base shadow'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSecretPinModal(false);
                  setPinKeypadInput('');
                  setPinKeypadError('');
                }}
                className="flex-1 py-2.5 bg-[#292447] hover:bg-[#322c56] text-slate-300 rounded-2xl font-bold text-xs cursor-pointer transition"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={pinKeypadInput.length !== 6}
                onClick={() => handleConfirmSecretPin(pinKeypadInput)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-extrabold text-xs rounded-2xl cursor-pointer transition shadow-lg"
              >
                {pinModalMode === 'unlock' ? 'Открыть чат' : 'Создать чат'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. DELETE CHAT MODAL (У себя и у двоих) */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-[#1c1c22] border border-[#33333d] rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                Удалить диалог?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Вы собираетесь удалить «{chat.title}». Выберите режим удаления:
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Удалить у себя и у двоих */}
              <button
                type="button"
                onClick={() => handleConfirmDeleteChat(true)}
                className="w-full p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-between cursor-pointer transition shadow-lg active:scale-95"
              >
                <div className="text-left">
                  <div className="font-extrabold">Удалить у себя и у двоих</div>
                  <div className="text-[10px] text-rose-100/80 font-normal">
                    Переписка исчезнет у обоих участников
                  </div>
                </div>
                <ShieldAlert className="w-5 h-5 shrink-0" />
              </button>

              {/* Option 2: Удалить только у себя */}
              <button
                type="button"
                onClick={() => handleConfirmDeleteChat(false)}
                className="w-full p-3.5 rounded-2xl bg-[#2a2a32] hover:bg-[#34343d] text-[#e1e3e6] font-semibold text-xs flex items-center justify-between cursor-pointer transition active:scale-95 border border-[#3e3e48]"
              >
                <div className="text-left">
                  <div className="font-bold">Удалить только у себя</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Диалог останется у собеседника
                  </div>
                </div>
                <Trash2 className="w-4 h-4 shrink-0 text-slate-400" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* 10. LEAVE GROUP / CHANNEL MODAL */}
      {showLeaveModal && (
        <div 
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowLeaveModal(false)}
        >
          <div 
            className="bg-[#1c1c22] border border-[#33333d] rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {chat.type === 'channel' ? 'Покинуть канал?' : 'Покинуть чат?'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Вы действительно хотите выйти из «{chat.title}»? Вы перестанете получать новые публикации и уведомления.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 bg-[#2a2a32] hover:bg-[#34343d] text-slate-300 rounded-2xl font-bold text-xs cursor-pointer transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveChat}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-2xl cursor-pointer transition shadow-lg active:scale-95"
              >
                Покинуть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
