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
  Search
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
  onRequestJoin?: (chatId: string, guestUser: { userName: string; username: string; avatarUrl: string }) => void;
  onApproveRequest?: (chatId: string, request: any) => void;
  onDeclineRequest?: (chatId: string, requestId: string) => void;
  onAddCommunityGif?: (gif: CommunityGif) => void;
  onUpdateChat?: (updatedChat: Chat) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string }) => void;
  onOpenCommunityFeed?: (chat: Chat) => void;
  onDeleteChatHistory?: (chatId: string, forBoth: boolean) => void;
  onDeleteChat?: (chatId: string, forBoth: boolean) => void;
  onLeaveChat?: (chatId: string) => void;
  isPhoneMode?: boolean;
}

const quickEmojis = ['❤️', '👍', '🔥', '😂', '🚀', '👏', '⚡', '🎉', '💡', '👀', '🤝', '☕'];

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
  onLeaveChat,
  isPhoneMode = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceStudioOpen, setIsVoiceStudioOpen] = useState(false);
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
  const [isSecretChat, setIsSecretChat] = useState(false);
  const [secretPin, setSecretPin] = useState('');
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
  const defaultMemberRole = (chat.members?.find((m) => m.userId === currentUser.id)?.role || 'owner') as 'owner' | 'admin' | 'member';
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>(defaultMemberRole);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
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
    const role = (chat.members?.find((m) => m.userId === currentUser.id)?.role || 'owner') as 'owner' | 'admin' | 'member';
    setUserRole(role);
  }, [chat.id]);

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

  const handleOpenSecretPinModal = () => {
    setShowMoreMenu(false);
    setPinKeypadInput('');
    setPinKeypadError('');
    setShowSecretPinModal(true);
  };

  const handleConfirmSecretPin = (pin: string) => {
    if (pin.length !== 6) {
      setPinKeypadError('Код должен состоять ровно из 6 цифр');
      return;
    }
    setSecretPin(pin);
    setIsSecretChat(true);
    setShowSecretPinModal(false);
    playSentSound();
    triggerToast('🔒 Секретный чат с 6-значным паролем активирован');
    onSendMessage('text', '🔐 Секретный чат активирован: включено сквозное E2E шифрование. Чат защищён 6-значным паролем.');
  };

  const handleEndSecretChat = () => {
    setShowMoreMenu(false);
    setIsSecretChat(false);
    setSecretPin('');
    playReactionSound();
    triggerToast('Секретный чат завершён. Обычный режим восстановлен.');
    onSendMessage('text', '🔓 Секретный чат завершён. Диалог переведён в обычный режим.');
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

  // Handle Send: реальная отправка сообщения в AuraChat
  const handleSend = () => {
    if (isBlocked) {
      triggerToast('Собеседник заблокирован. Разблокируйте, чтобы отправлять сообщения.');
      return;
    }
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setShowManagerTemplates(false);

    const replyMeta = replyingToMessage ? {
      replyTo: {
        id: replyingToMessage.id,
        senderName: replyingToMessage.senderName,
        content: replyingToMessage.content || 'Медиасообщение'
      }
    } : undefined;

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
    if (chat.inviteCode) {
      navigator.clipboard.writeText(`https://aurachat.app/join/${chat.inviteCode}`);
      setShowInviteCopied(true);
      setTimeout(() => setShowInviteCopied(false), 2000);
    }
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
      trimmedLengthSec: data.trimmedLengthSec
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

  const displayMessages = messages.filter((m) => {
    if (chat.topics && activeTopicId && activeTopicId !== 'top_all') {
      return m.topicId === activeTopicId;
    }
    return true;
  });

  const isGroupOrChannel = chat.type === 'group' || chat.type === 'channel';

  return (
    <div className="flex-1 h-full w-full min-w-0 max-w-full flex flex-col bg-[#141414] relative overflow-hidden text-[#e1e3e6] select-none min-h-0">
      {/* 1. TOP HEADER (VKontakte Messenger Header) */}
      <div className="w-full min-w-0 max-w-full px-3 sm:px-4 py-2.5 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between gap-1 sm:gap-2 shrink-0 z-20">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className={`${isPhoneMode ? 'flex' : 'md:hidden flex'} items-center justify-center p-1 -ml-0.5 text-[#71aaeb] hover:text-white rounded-lg shrink-0 cursor-pointer`}
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
                className="w-9 h-9 rounded-full object-cover group-hover:opacity-90 transition"
              />
              {chat.type === 'direct' && (
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
                      <span>E2E (PIN)</span>
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
                ) : chat.type === 'saved' ? (
                  <span className="text-[#828282]">Избранное • личные заметки</span>
                ) : chat.type === 'direct' ? (
                  <span className="text-emerald-400">в сети</span>
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
          {chat.requiresApproval && chat.joinRequests && chat.joinRequests.length > 0 && isOwnerOrAdmin && (
            <button
              onClick={() => setIsJoinRequestsOpen(true)}
              className="px-2 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
              title="Ожидают одобрения заявки на вступление"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{chat.joinRequests.length}</span>
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
              className="p-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#71aaeb] hover:text-white transition cursor-pointer shrink-0"
              title="Ссылка и QR-код для приглашения"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          {chat.type !== 'saved' && (
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
                title={isBlocked ? 'Собеседник заблокирован' : 'Видеозвонок AuraChat'}
              >
                <Video className="w-4 h-4" />
              </button>
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
                {chat.type === 'direct' ? (
                  <>
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

                    {/* 2. Начать секретный чат (6-код) */}
                    <button
                      onClick={isSecretChat ? handleEndSecretChat : handleOpenSecretPinModal}
                      className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 transition text-left cursor-pointer ${
                        isSecretChat
                          ? 'hover:bg-rose-500/15 text-rose-300'
                          : 'hover:bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {isSecretChat ? (
                        <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{isSecretChat ? 'Завершить секретный чат' : 'Начать секретный чат'}</span>
                          {!isSecretChat && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              6-код
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-70">
                          {isSecretChat
                            ? 'Отключить сквозное шифрование'
                            : 'Придумать пароль 6-код и включить E2E'}
                        </div>
                      </div>
                    </button>

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
        <div className="w-full bg-gradient-to-r from-emerald-950/90 via-[#162725] to-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 shrink-0 z-10 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-[11px]">
              🔒 <b>Секретный чат активен:</b> Сквозное E2E шифрование, диалог защищен 6-значным паролем.
            </span>
          </div>
          <button
            onClick={handleEndSecretChat}
            className="text-[10px] text-emerald-300 hover:text-white underline cursor-pointer"
          >
            Завершить
          </button>
        </div>
      )}

      {/* IN-CHAT MESSAGE SEARCH OVERLAY (ПОИСК В ПЕРЕПИСКЕ) */}
      {isChatSearchOpen && (
        <div className="w-full bg-[#1c1c20] border-b border-[#2e2e2e] px-4 py-2 flex items-center gap-2 text-xs text-white shrink-0 animate-in fade-in slide-in-from-top-1 z-10">
          <Search className="w-4 h-4 text-[#71aaeb] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Поиск по истории сообщений в этом чате..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
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
                {/* Floating Quick Action Bar (VK / Telegram style: Reactions, Reply, Pin, Forward) */}
                {hoveredMessageId === msg.id && (
                  <div className={`absolute -top-8 z-20 flex items-center gap-1 bg-[#222222] border border-[#2e2e2e] rounded-full px-2 py-0.5 shadow-xl transition animate-in fade-in zoom-in-95 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}>
                    {['❤️', '👍', '🔥', '😂', '🚀'].map((em) => (
                      <button
                        key={em}
                        onClick={() => handleReactionClick(msg.id, em)}
                        className="text-xs sm:text-sm hover:scale-125 transition p-0.5 cursor-pointer"
                        title={`Реакция ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                    <div className="w-px h-3 bg-[#3a3b3c] mx-0.5" />
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Ответить на сообщение"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setPinnedMessage(msg);
                        triggerToast('📌 Сообщение закреплено вверху чата');
                      }}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Закрепить сообщение"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setForwardingMessage(msg)}
                      className="p-1 text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Переслать сообщение"
                    >
                      <Share2 className="w-3.5 h-3.5" />
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

                  {/* PHOTO / ATTACHMENT */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="py-1 relative group/img">
                      <img
                        src={msg.mediaUrl}
                        alt="Вложение"
                        onClick={() => setLightboxImage(msg.mediaUrl!)}
                        className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMediaFile(msg.mediaUrl!, `vk_photo_${msg.id}`, 'image');
                        }}
                        className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition"
                        title="Скачать фото"
                      >
                        <Download className="w-3 h-3" />
                        <span>Скачать фото</span>
                      </button>
                    </div>
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

                  {/* Timestamp & checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#939393]">
                    <span>{msg.createdAt}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#71aaeb]" />}
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

          <div className="w-full min-w-0 max-w-full px-2 sm:px-3 py-2 bg-[#222222] border-t border-[#2e2e2e] flex items-center gap-1 sm:gap-1.5 shrink-0 relative overflow-visible">
          {/* Floating Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-2 bg-[#222222] border border-[#2e2e2e] rounded-2xl p-2.5 shadow-2xl z-30 flex flex-wrap gap-1 w-56">
              {quickEmojis.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    setInputText((prev) => prev + em);
                    setShowEmojiPicker(false);
                  }}
                  className="text-lg sm:text-xl p-1.5 rounded-xl hover:bg-[#2c2d2e] transition cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          <label
            className="p-1.5 text-[#828282] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
            title="Прикрепить фото или файл"
          >
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              accept="image/*,audio/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.type.startsWith('audio/')) {
                    handleAudioFileSelected(f);
                  } else {
                    const { url } = await fileToPersistentUrl(f);
                    playSentSound();
                    onSendMessage('image', 'Фотография', url);

                    if (chat.id === 'chat_gif_hub' && onAddCommunityGif) {
                      onAddCommunityGif({
                        id: 'cgif_' + Date.now(),
                        title: 'Реакция от @' + currentUser.username,
                        url: url,
                        authorId: currentUser.id,
                        authorName: currentUser.displayName,
                        authorUsername: currentUser.username,
                        authorAvatar: currentUser.avatarUrl,
                        createdAt: 'Только что',
                        usesCount: 1
                      });
                    }
                  }
                  e.target.value = '';
                }
              }}
            />
          </label>

          {/* Music Button */}
          <label
            className="p-1.5 text-[#71aaeb] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
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
            placeholder="Напишите сообщение..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="w-0 min-w-0 flex-1 bg-[#2c2d2e] text-white text-xs rounded-lg px-3 py-2 outline-none placeholder-[#828282] border border-transparent focus:border-[#0077FF] transition"
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

          {/* Video Note Button */}
          <button
            onClick={onOpenVideoNoteRecorder}
            className="p-1.5 text-[#828282] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
            title="Видеосообщение"
          >
            <Disc className="w-4 h-4" />
          </button>

          {/* Voice Note Button */}
          <button
            onClick={() => setIsVoiceStudioOpen(true)}
            onMouseDown={() => setIsVoiceStudioOpen(true)}
            className="p-1.5 text-[#828282] hover:text-white hover:bg-[#2c2d2e] rounded-lg transition cursor-pointer shrink-0"
            title="Голосовое сообщение"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            className="p-2 bg-[#0077FF] hover:bg-[#0066DD] text-white rounded-lg transition cursor-pointer shrink-0"
            title="Отправить сообщение (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
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
            mediaUrl: audioUrl
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

      {/* 5.1. INVITE LINK & QR CODE MODAL */}
      <InviteAndQRModal
        isOpen={isInviteAndQROpen}
        chat={chat}
        onClose={() => setIsInviteAndQROpen(false)}
        onRequestJoin={(chatId, guestUser) => {
          if (onRequestJoin) onRequestJoin(chatId, guestUser);
        }}
      />

      {/* 5.2. JOIN REQUESTS MANAGEMENT MODAL (FOR OWNER/ADMIN) */}
      <JoinRequestsModal
        isOpen={isJoinRequestsOpen}
        chat={chat}
        onClose={() => setIsJoinRequestsOpen(false)}
        onApproveRequest={(chatId, req) => {
          if (onApproveRequest) onApproveRequest(chatId, req);
        }}
        onDeclineRequest={(chatId, reqId) => {
          if (onDeclineRequest) onDeclineRequest(chatId, reqId);
        }}
      />

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
                Пароль Секретного Чата
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Придумайте <b className="text-emerald-400">6-значный цифровой код</b> для защиты диалога с «{chat.title}». Включится сквозное E2E шифрование.
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
                Активировать
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
