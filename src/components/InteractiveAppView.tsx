import React, { useState, useRef, useEffect } from 'react';
import { 
  currentUserMock, 
  mockChats, 
  mockStories, 
  mockReelsAndPosts 
} from '../data/mockData';
import { Chat, Message, Post, Story, User } from '../types';
import { 
  Send, Paperclip, Mic, Disc, Video, Phone, Users, Shield, 
  EyeOff, Lock, UserCheck, MessageSquare, Play, Heart, MessageCircle, 
  Share2, Bookmark, Volume2, VolumeX, Sparkles, Hash, Link2, Copy, Check, Clock, X, ChevronRight
} from 'lucide-react';
import { VideoNoteModal } from './VideoNoteModal';
import { WebRTCCallModal } from './WebRTCCallModal';
import { ShareReelModal } from './messenger/ShareReelModal';
import { playReactionSound } from '../utils/audioUtils';

export const InteractiveAppView: React.FC = () => {
  // Navigation: 'chats' | 'reels' | 'posts'
  const [activeView, setActiveView] = useState<'chats' | 'reels' | 'posts'>('chats');
  
  // User & Privacy State
  const [user, setUser] = useState<User>(currentUserMock);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Chat State
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<Chat>(mockChats[0]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    mockChats[0].topics ? mockChats[0].topics[0].id : null
  );

  // Messages per chat
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      chatId: 'chat_core_team',
      topicId: 'top_general',
      senderId: 'usr_alex',
      senderName: 'Алексей (DevOps)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      type: 'text',
      content: 'Привет команде! Подключили Redis Streams для шины сообщений и WebSockets.',
      createdAt: '10:15',
      status: 'read'
    },
    {
      id: 'm2',
      chatId: 'chat_core_team',
      topicId: 'top_general',
      senderId: 'usr_me_777',
      senderName: 'Максим (Tech Lead)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
      type: 'voice',
      content: 'Голосовое сообщение (Opus 48kHz)',
      mediaMeta: { durationSec: 14, waveform: [30, 60, 45, 80, 100, 75, 40, 90, 50, 70, 30] },
      createdAt: '10:18',
      status: 'read'
    },
    {
      id: 'm3',
      chatId: 'chat_core_team',
      topicId: 'top_general',
      senderId: 'usr_alex',
      senderName: 'Алексей (DevOps)',
      senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      type: 'video_note',
      content: 'Круглое видеосообщение',
      mediaUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b',
      mediaMeta: { durationSec: 8 },
      createdAt: '10:20',
      status: 'read'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Modals
  const [isVideoNoteOpen, setIsVideoNoteOpen] = useState(false);
  const [callModalData, setCallModalData] = useState<{ open: boolean; isVideo: boolean; contactName: string; avatar: string } | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Invite Link feedback
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Mobile / tablet chat view state
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const appTopicsRef = useRef<HTMLDivElement>(null);

  // Post interactions state
  const [postLikes, setPostLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);

  const handleTogglePostLike = (postId: string, initialCount: number) => {
    setPostLikes(prev => {
      const current = prev[postId] || { liked: false, count: initialCount };
      const nextLiked = !current.liked;
      return {
        ...prev,
        [postId]: {
          liked: nextLiked,
          count: nextLiked ? current.count + 1 : current.count - 1
        }
      };
    });
  };

  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

  const handleToggleSavePost = (postId: string) => {
    playReactionSound();
    setSavedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Stories Auto-timer
  useEffect(() => {
    let timer: any;
    if (activeStory) {
      setStoryProgress(0);
      timer = setInterval(() => {
        setStoryProgress((p) => {
          if (p >= 100) {
            setActiveStory(null);
            return 0;
          }
          return p + 2;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [activeStory]);

  const handleSendMessage = (type: 'text' | 'voice' | 'video_note' | 'image' = 'text', mediaUrl?: string, meta?: any) => {
    if (type === 'text' && !inputMessage.trim()) return;

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      chatId: selectedChat.id,
      topicId: selectedTopicId || undefined,
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatarUrl,
      type: type,
      content: type === 'text' ? inputMessage.trim() : (type === 'voice' ? 'Голосовое сообщение' : 'Круглое видеосообщение'),
      mediaUrl: mediaUrl,
      mediaMeta: meta,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages((prev) => [...prev, newMsg]);
    if (type === 'text') setInputMessage('');
  };

  const handleCopyInvite = () => {
    if (selectedChat.inviteCode) {
      navigator.clipboard.writeText(`https://t.me/join/${selectedChat.inviteCode}`);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  // Filter messages by current topic if applicable
  const currentMessages = messages.filter((m) => {
    if (m.chatId !== selectedChat.id) return false;
    if (selectedChat.topics && selectedTopicId) {
      return m.topicId === selectedTopicId;
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Application Bar with Profile & Privacy */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border-2 border-blue-500" />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
              user.hideOnlineStatus ? 'bg-slate-500' : 'bg-emerald-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{user.displayName}</span>
              <span className="text-xs text-blue-400 font-mono">@{user.username}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {user.hideOnlineStatus ? 'Статус: Скрыт (Ghost Mode)' : 'Статус: В сети'}
            </div>
          </div>
        </div>

        {/* View Switcher: Chats | Reels | Posts */}
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveView('chats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'chats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Чаты & Каналы
          </button>
          <button
            onClick={() => setActiveView('reels')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'reels' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Reels (Видео)
          </button>
          <button
            onClick={() => setActiveView('posts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'posts' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Лента Постов
          </button>
        </div>

        {/* Privacy Settings Trigger */}
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          <Lock className="w-3.5 h-3.5 text-blue-400" /> Приватность
        </button>
      </div>

      {/* Stories Bar (Instagram 24h Vanishing Stories) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 overflow-x-hidden">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Stories (Исчезают через 24 часа)
          </span>
          <span className="text-[11px] text-slate-400">S3 Lifecycle + Postgres TTL</span>
        </div>

        <div className="flex items-center gap-4">
          {mockStories.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveStory(s)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 group-hover:scale-105 transition">
                <div className="p-0.5 rounded-full bg-slate-900">
                  <img src={s.userAvatar} alt={s.userName} className="w-14 h-14 rounded-full object-cover" />
                </div>
              </div>
              <span className="text-[11px] text-slate-300 font-medium truncate max-w-[70px]">
                {s.userName.split(' ')[0]}
              </span>
              <span className="text-[9px] text-amber-400/90 font-mono">
                24ч таймер
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      {activeView === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[680px]">
          {/* Chat List (Sidebar 4 cols) */}
          <div className={`lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden ${mobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Диалоги и Каналы</h3>
              <span className="text-xs text-slate-400">{chats.length} чата</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {chats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedChat(c);
                    setSelectedTopicId(c.topics ? c.topics[0].id : null);
                    setMobileChatOpen(true);
                  }}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    selectedChat.id === c.id ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <img src={c.avatarUrl} alt={c.title} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-white text-xs truncate">{c.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{c.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{c.lastMessage}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                        {c.type}
                      </span>
                      {c.topics && (
                        <span className="text-[10px] text-blue-400 font-medium">
                          • {c.topics.length} топика
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Main Area (8 cols) */}
          <div className={`lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden ${!mobileChatOpen ? 'hidden lg:flex' : 'flex'}`}>
            {/* Chat Top Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                  title="Назад к чатам"
                >
                  ←
                </button>
                <img src={selectedChat.avatarUrl} alt={selectedChat.title} className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm flex items-center gap-2 truncate">
                    <span className="truncate">{selectedChat.title}</span>
                    {selectedChat.type === 'channel' && <span className="text-xs text-blue-400 shrink-0">📢</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                    <span className="shrink-0">{selectedChat.membersCount} участников</span>
                    {selectedChat.inviteCode && (
                      <button
                        onClick={handleCopyInvite}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono text-[10px] truncate"
                      >
                        <Link2 className="w-3 h-3 shrink-0" /> {copiedInvite ? 'Инвайт скопирован!' : 't.me/join/...'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Audio Call / Video Call */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCallModalData({
                    open: true,
                    isVideo: false,
                    contactName: selectedChat.title,
                    avatar: selectedChat.avatarUrl
                  })}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Аудиозвонок (WebRTC)"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCallModalData({
                    open: true,
                    isVideo: true,
                    contactName: selectedChat.title,
                    avatar: selectedChat.avatarUrl
                  })}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  title="Видеозвонок (WebRTC)"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Forum Topics Bar (if chat has topics) */}
            {selectedChat.topics && (
              <div 
                ref={appTopicsRef}
                onWheel={(e) => {
                  if (appTopicsRef.current && e.deltaY !== 0) {
                    e.preventDefault();
                    appTopicsRef.current.scrollLeft += e.deltaY;
                  }
                }}
                className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] [touch-action:pan-x] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent text-xs whitespace-nowrap shrink-0 z-10 w-full select-none"
              >
                <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider shrink-0">
                  Ветки:
                </span>
                {selectedChat.topics.map((top) => (
                  <button
                    key={top.id}
                    onClick={() => setSelectedTopicId(top.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm ${
                      selectedTopicId === top.id
                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{top.icon}</span>
                    <span>{top.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
              {currentMessages.map((msg) => {
                const isMe = msg.senderId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe ? 'bg-blue-600 text-white rounded-br-xs' : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between gap-3 mb-1 font-semibold text-[11px] opacity-90">
                        <span>{isMe ? 'Вы' : msg.senderName}</span>
                        <span className="text-[10px] opacity-75">{msg.createdAt}</span>
                      </div>

                      {/* TEXT MESSAGE */}
                      {msg.type === 'text' && <p>{msg.content}</p>}

                      {/* VOICE MESSAGE */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-3 py-1">
                          <button
                            onClick={() => setIsPlayingAudio(isPlayingAudio === msg.id ? null : msg.id)}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                          >
                            <Play className={`w-3.5 h-3.5 ${isPlayingAudio === msg.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <div className="flex items-center gap-1 h-5">
                            {msg.mediaMeta?.waveform?.map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h * 0.2}px` }}
                                className={`w-1 rounded-full ${
                                  isPlayingAudio === msg.id ? 'bg-white animate-bounce' : 'bg-white/60'
                                }`}
                              />
                            )) || <span className="text-[11px]">0:14</span>}
                          </div>
                          <span className="text-[10px] font-mono opacity-80">
                            {msg.mediaMeta?.durationSec || 14}s
                          </span>
                        </div>
                      )}

                      {/* VIDEO NOTE ("КРУЖОЧЕК") */}
                      {msg.type === 'video_note' && (
                        <div className="py-1">
                          <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-white/50 relative shadow-inner mx-auto bg-black">
                            <img src={msg.mediaUrl || msg.senderAvatar} alt="Кружочек" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end justify-center pb-2">
                              <span className="text-[10px] font-mono text-white bg-black/60 px-2 py-0.5 rounded-full">
                                00:{msg.mediaMeta?.durationSec?.toString().padStart(2, '0') || '08'}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] text-center mt-1 text-blue-200">
                            Круглое видеосообщение
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Bottom Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Напишите сообщение..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage('text')}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />

              {/* Voice Button */}
              <button
                onClick={() => handleSendMessage('voice')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Отправить голосовое"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Video Note Button ("Кружочек") */}
              <button
                onClick={() => setIsVideoNoteOpen(true)}
                className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition border border-blue-500/30"
                title="Записать видеосообщение-кружочек"
              >
                <Disc className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage('text')}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REELS VIEW (Instagram Vertical Video Mode) */}
      {activeView === 'reels' && (
        <div className="flex justify-center">
          <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative h-[640px] flex flex-col justify-between">
            {/* Reel Media Mock */}
            <div className="absolute inset-0 z-0">
              <img
                src={mockReelsAndPosts[0].mediaUrl}
                alt="Reels video"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40" />
            </div>

            {/* Reel Header */}
            <div className="relative z-10 p-4 flex items-center justify-between text-white">
              <span className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                <Play className="w-4 h-4 fill-current text-rose-500" /> Reels
              </span>
              <span className="text-xs bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
                1080p HLS
              </span>
            </div>

            {/* Reel Right Action Bar */}
            <div className="relative z-10 p-4 self-end flex flex-col items-center gap-4 text-white">
              {(() => {
                const reelPost = mockReelsAndPosts[0];
                const likeState = postLikes[reelPost.id] || { liked: false, count: reelPost.likesCount };
                return (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <button 
                        onClick={() => handleTogglePostLike(reelPost.id, reelPost.likesCount)}
                        className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition cursor-pointer ${likeState.liked ? 'text-rose-500 scale-110' : 'hover:text-rose-500'}`}
                      >
                        <Heart className={`w-6 h-6 ${likeState.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                      <span className="text-xs font-bold">{likeState.count}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button 
                        onClick={() => alert('💬 Комментарии к Reels')}
                        className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:text-blue-400 transition cursor-pointer"
                      >
                        <MessageCircle className="w-6 h-6" />
                      </button>
                      <span className="text-xs font-bold">{reelPost.commentsCount}</span>
                    </div>
                    <button 
                      onClick={() => setShareModalPost(reelPost)}
                      className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:text-emerald-400 transition cursor-pointer"
                      title="Поделиться"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Reel Bottom Caption & Author */}
            <div className="relative z-10 p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <img src={mockReelsAndPosts[0].userAvatar} alt="" className="w-8 h-8 rounded-full border border-white" />
                <span className="font-bold text-xs">{mockReelsAndPosts[0].userName}</span>
                <button className="px-2.5 py-0.5 rounded-full border border-white text-[10px] font-semibold">
                  Подписаться
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-200">
                {mockReelsAndPosts[0].caption}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* POSTS & THREADS VIEW */}
      {activeView === 'posts' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {mockReelsAndPosts.map((post) => {
            const likeState = postLikes[post.id] || { liked: false, count: post.likesCount };
            return (
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <img src={post.userAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <div className="text-xs font-bold text-white">{post.userName}</div>
                      <div className="text-[10px] text-slate-400">{post.createdAt}</div>
                    </div>
                  </div>
                </div>

                <div className="aspect-video bg-black overflow-hidden">
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3 text-slate-300">
                    <button 
                      onClick={() => handleTogglePostLike(post.id, post.likesCount)}
                      className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${likeState.liked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
                    >
                      <Heart className={`w-4 h-4 ${likeState.liked ? 'fill-rose-500 text-rose-500' : ''}`} /> 
                      <span>{likeState.count}</span>
                    </button>
                    
                    <button 
                      onClick={() => alert('💬 Комментарии к посту')}
                      className="flex items-center gap-1.5 text-xs hover:text-blue-400 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> <span>{post.commentsCount}</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button 
                        onClick={() => handleToggleSavePost(post.id)}
                        className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs ${
                          savedPosts[post.id] 
                            ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40' 
                            : 'hover:text-amber-400 text-slate-300'
                        }`}
                        title={savedPosts[post.id] ? 'В сохранённых (нажмите чтобы убрать)' : 'Сохранить пост'}
                      >
                        <Bookmark className={`w-4 h-4 ${savedPosts[post.id] ? 'fill-amber-400 text-amber-400' : ''}`} />
                        <span>{savedPosts[post.id] ? 'Сохранено' : 'Сохранить'}</span>
                      </button>

                      <button 
                        onClick={() => setShareModalPost(post)}
                        className="flex items-center gap-1.5 text-xs hover:text-emerald-400 cursor-pointer p-2 rounded-xl text-slate-300"
                        title="Поделиться"
                      >
                        <Share2 className="w-4 h-4" /> <span>Поделиться</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-200 mb-4">{post.caption}</p>

                  {/* Nested Thread Comments */}
                  <div className="border-t border-slate-800 pt-3 space-y-2.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">
                      Ветки комментариев (Threads):
                    </div>
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="font-bold text-blue-400 text-[11px]">{c.userName}</div>
                        <div className="text-slate-300 mt-0.5">{c.content}</div>

                        {c.replies?.map((r) => (
                          <div key={r.id} className="mt-2 pl-3 border-l-2 border-slate-700 text-slate-400">
                            <div className="font-semibold text-slate-300 text-[10px]">{r.userName}</div>
                            <div className="text-slate-300 text-[11px]">{r.content}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal for Posts */}
      <ShareReelModal
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
        reel={shareModalPost}
        chats={chats}
        onSendToChat={(chatId, post, customMsg) => {
          console.log('Shared post to chat:', chatId, post.id, customMsg);
        }}
      />

      {/* PRIVACY SETTINGS MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" /> Настройки Приватности и Доступа
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Контролируйте видимость профиля, контактов и real-time присутствия.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-blue-400" /> Скрывать статус «В сети» (Ghost)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Маскирует last_seen для собеседников («был недавно»)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={user.hideOnlineStatus}
                  onChange={(e) => setUser({ ...user, hideOnlineStatus: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Скрывать телефон и почту
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    В профиле виден только юзернейм (@{user.username})
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={user.hideContacts}
                  onChange={(e) => setUser({ ...user, hideContacts: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" /> Приватный аккаунт
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Доступ к историям и постам только после одобрения заявки
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={user.isPrivate}
                  onChange={(e) => setUser({ ...user, isPrivate: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN STORY VIEWER (24h EXPIRE MODAL) */}
      {activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm h-[600px] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Story Progress Bar */}
            <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
              <div className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
                <div
                  style={{ width: `${storyProgress}%` }}
                  className="h-full bg-white transition-all duration-100 ease-linear"
                />
              </div>
            </div>

            {/* Story Top Info */}
            <div className="relative z-20 p-4 pt-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <img src={activeStory.userAvatar} alt="" className="w-8 h-8 rounded-full border border-white" />
                <div>
                  <div className="font-bold text-xs">{activeStory.userName}</div>
                  <div className="text-[10px] text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Исчезает через 18ч (24h TTL)
                  </div>
                </div>
              </div>
              <button onClick={() => setActiveStory(null)} className="p-1 rounded-full bg-black/40">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Story Image */}
            <img src={activeStory.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" />

            {/* Story Caption */}
            {activeStory.caption && (
              <div className="relative z-20 p-4 bg-gradient-to-t from-black via-black/40 to-transparent text-white text-xs">
                {activeStory.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIDEO NOTE RECORDER MODAL */}
      <VideoNoteModal
        isOpen={isVideoNoteOpen}
        onClose={() => setIsVideoNoteOpen(false)}
        onSendVideoNote={(url, sec) => handleSendMessage('video_note', url, { durationSec: sec })}
      />

      {/* WEBRTC CALL MODAL */}
      {callModalData && (
        <WebRTCCallModal
          isOpen={callModalData.open}
          contactName={callModalData.contactName}
          avatarUrl={callModalData.avatar}
          isVideoCall={callModalData.isVideo}
          onClose={() => setCallModalData(null)}
        />
      )}
    </div>
  );
};
