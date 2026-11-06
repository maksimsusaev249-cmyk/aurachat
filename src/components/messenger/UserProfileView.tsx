import React, { useState } from 'react';
import { User, Post, ProfileVisitor } from '../../types';
import { 
  Camera, 
  Settings, 
  Share2, 
  Grid, 
  Film, 
  Eye, 
  Search, 
  Bookmark, 
  Heart, 
  MessageCircle, 
  Music, 
  ShieldCheck, 
  EyeOff, 
  Check, 
  Plus, 
  ChevronLeft, 
  Layers, 
  Sparkles,
  QrCode,
  UserCheck,
  Clock,
  Play,
  Download,
  RefreshCw,
  LogOut,
  Trash2,
  Repeat,
  X,
  Link2,
  FileText,
  ExternalLink,
  Lock,
  KeyRound,
  Send,
  Phone,
  Video,
  UserPlus
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { isVideoMedia } from '../../utils/mediaUtils';
import { formatSmartTime } from '../../utils/dateUtils';
import { AvatarEditorModal } from './AvatarEditorModal';
import { InstallAppModal } from './InstallAppModal';

export interface ProfileTargetUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  phone?: string;
  email?: string;
}

interface UserProfileViewProps {
  currentUser: User;
  savedAccounts?: User[];
  targetUser?: ProfileTargetUser | null;
  isFollowing?: boolean;
  onToggleFollow?: (userId: string) => void;
  onStartChatWithUser?: (user: ProfileTargetUser) => void;
  onStartCallWithUser?: (user: ProfileTargetUser, isVideo: boolean) => void;
  posts: Post[];
  reels: Post[];
  visitors: ProfileVisitor[];
  subscribersCount?: number;
  isCleanNewProfile?: boolean;
  onBackToChats: () => void;
  onOpenStudio: () => void;
  onOpenSettings: (initialTab?: any) => void;
  onUpdateUser?: (updated: Partial<User>) => void;
  onResetToNewProfile?: () => void;
  onLoadDemoProfile?: () => void;
  onSelectChatByUser?: (userId: string) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string }) => void;
  savedPostIds?: Record<string, boolean>;
  onToggleLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, comment: any) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onOpenGlobalSearch?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  savedAccounts = [],
  targetUser = null,
  isFollowing = false,
  onToggleFollow,
  onStartChatWithUser,
  onStartCallWithUser,
  posts,
  reels,
  visitors,
  subscribersCount = 0,
  isCleanNewProfile = false,
  onBackToChats,
  onOpenStudio,
  onOpenSettings,
  onUpdateUser,
  onResetToNewProfile,
  onLoadDemoProfile,
  onSelectChatByUser,
  onOpenUserProfile,
  savedPostIds = {},
  onToggleLikePost,
  onAddComment,
  onDeleteComment,
  onOpenGlobalSearch
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'reposts' | 'saved'>('posts');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Determine whether this page represents current user or an opened user profile
  const isMe = !targetUser || targetUser.id === currentUser.id;
  const matchedSavedUser = !isMe && targetUser
    ? savedAccounts.find(
        (acc) =>
          acc.id === targetUser.id ||
          acc.username.toLowerCase() === targetUser.username.toLowerCase() ||
          acc.displayName.toLowerCase() === targetUser.name.toLowerCase()
      )
    : null;

  const activeProfileUser = isMe
    ? {
        ...currentUser,
        isOnline: currentUser.hideOnlineStatus ? false : (currentUser.isOnline !== false && (currentUser.lastSeen || 'в сети') === 'в сети'),
        lastSeen: currentUser.hideOnlineStatus ? 'был(а) в сети недавно' : (currentUser.lastSeen || 'в сети')
      }
    : {
        id: targetUser!.id,
        displayName: matchedSavedUser?.displayName || targetUser!.name,
        username: matchedSavedUser?.username || targetUser!.username,
        avatarUrl: matchedSavedUser?.avatarUrl || targetUser!.avatar,
        bio: matchedSavedUser?.bio || targetUser!.bio || 'Пользователь платформы AuraChat',
        isOnline: matchedSavedUser
          ? matchedSavedUser.hideOnlineStatus
            ? false
            : Boolean(matchedSavedUser.isOnline && (matchedSavedUser.lastSeen || 'в сети') === 'в сети')
          : false,
        lastSeen: matchedSavedUser
          ? matchedSavedUser.hideOnlineStatus
            ? 'был(а) в сети недавно'
            : matchedSavedUser.lastSeen || (matchedSavedUser.isOnline ? 'в сети' : 'был(а) в сети недавно')
          : 'был(а) в сети недавно'
      };

  // Filter posts, reels, and reposts belonging to the displayed profile user
  const myPosts = posts.filter(
    (p) =>
      p.userId === activeProfileUser.id ||
      p.userName === activeProfileUser.displayName ||
      p.userName === activeProfileUser.username
  );
  const myReels = reels.filter(
    (r) =>
      r.userId === activeProfileUser.id ||
      r.userName === activeProfileUser.displayName ||
      r.userName === activeProfileUser.username
  );
  const myReposts = [...posts, ...reels].filter((p) => p.isReposted);

  // Total profile views counter (real count from visitors, 0 by default)
  const totalProfileViews = visitors.reduce((sum, v) => sum + v.viewCount, 0);

  // Filter saved posts
  const mySavedPosts = [...posts, ...reels].filter((p) => savedPostIds[p.id]);

  const liveSelectedPost = selectedPost
    ? [...posts, ...reels].find((p) => p.id === selectedPost.id) || selectedPost
    : null;


  return (
    <div className="flex-1 h-full bg-[#141414] overflow-y-auto p-3 sm:p-5 flex flex-col items-center select-none text-[#e1e3e6] scrollbar-thin">
      <div className="w-full max-w-3xl space-y-4 pb-16">
        
        {/* AuraChat Profile Top Navigation Bar */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-[#222222] border border-[#2e2e2e] flex items-center justify-between">
          <button
            onClick={onBackToChats}
            className="h-9 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] flex items-center gap-1.5 text-xs text-[#71aaeb] hover:text-white font-semibold cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isMe ? 'К чатам' : 'Назад'}</span>
          </button>
          
          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
            <span>Профиль AuraChat · @{activeProfileUser.username}</span>
            {isMe && currentUser.hideOnlineStatus && (
              <span className="p-1 rounded-full bg-[#2c2d2e] text-[#939393]" title="Невидимка включен">
                <EyeOff className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenGlobalSearch && (
              <button
                onClick={onOpenGlobalSearch}
                className="h-9 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition border border-[#3a3b3c]/60"
                title="Поиск людей, сообществ, постов, видео и фото"
              >
                <Search className="w-4 h-4 text-[#71aaeb]" />
                <span className="hidden sm:inline">Поиск</span>
              </button>
            )}
            <button
              onClick={() => setShowQrModal(true)}
              className="w-9 h-9 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] flex items-center justify-center cursor-pointer transition"
              title="QR-код профиля"
            >
              <QrCode className="w-4 h-4 text-[#71aaeb]" />
            </button>
            {isMe && (
              <button
                onClick={() => onOpenSettings('profile')}
                className="w-9 h-9 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] flex items-center justify-center cursor-pointer transition"
                title="Настройки профиля"
              >
                <Settings className="w-4 h-4 text-[#71aaeb]" />
              </button>
            )}
          </div>
        </div>

        {/* VK Profile Header Card (Cover + Overlapping Circular Avatar + VK Actions) */}
        <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl shadow-lg overflow-hidden">
          {/* VK Cover Banner */}
          <div className="h-32 sm:h-40 w-full bg-gradient-to-r from-[#0077FF]/40 via-[#1f3b64] to-[#192230] relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            
            {/* Top-Right "Гости профиля" VK Button (shown only for own profile) */}
            {isMe ? (
              <button
                onClick={() => {
                  playReactionSound();
                  setShowVisitorsModal(true);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 cursor-pointer"
                title="Посмотреть гостей страницы"
              >
                <Eye className="w-3.5 h-3.5 text-[#71aaeb]" />
                <span>Гости профиля ({visitors.length})</span>
              </button>
            ) : (
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 ${
                activeProfileUser.isOnline ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${activeProfileUser.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>{activeProfileUser.lastSeen}</span>
              </div>
            )}
          </div>

          {/* Profile Identity & Actions */}
          <div className="px-4 sm:px-6 pb-5 pt-2 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              {/* Left: Circular VK Avatar + Name + Status */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left min-w-0 flex-1">
                <div 
                  onClick={isMe ? () => setShowAvatarEditor(true) : undefined}
                  className={`relative -mt-14 sm:-mt-16 group shrink-0 ${isMe ? 'cursor-pointer' : ''}`}
                  title={isMe ? "Нажмите, чтобы обновить фотографию страницы" : activeProfileUser.displayName}
                >
                  <img
                    src={activeProfileUser.avatarUrl}
                    alt={activeProfileUser.displayName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#222222] bg-[#19191a] shadow-xl"
                  />
                  {isMe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAvatarEditor(true);
                      }}
                      className="absolute bottom-1 right-1 p-1.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white shadow cursor-pointer"
                      title="Изменить фото"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-0.5">
                  <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="truncate">{activeProfileUser.displayName}</span>
                    <ShieldCheck className="w-5 h-5 text-[#0077FF] shrink-0" />
                  </h1>
                  <p className="text-xs sm:text-[13px] text-[#939393] mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                    <span>@{activeProfileUser.username}</span>
                    <span>·</span>
                    <span className={activeProfileUser.isOnline ? 'text-emerald-400 font-medium' : 'text-[#828282]'}>
                      {activeProfileUser.lastSeen}
                    </span>
                  </p>
                </div>
              </div>

              {/* Right: VK Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 shrink-0">
                {isMe ? (
                  <>
                    <button
                      onClick={() => onOpenSettings('profile')}
                      className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs sm:text-[13px] font-semibold cursor-pointer"
                    >
                      Редактировать профиль
                    </button>

                    <button
                      onClick={() => setShowAvatarEditor(true)}
                      className="px-3 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Фото</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => targetUser && onStartChatWithUser?.(targetUser)}
                      className="px-4 py-2 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Сообщение</span>
                    </button>

                    <button
                      onClick={() => targetUser && onStartCallWithUser?.(targetUser, false)}
                      className="p-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Аудиозвонок"
                    >
                      <Phone className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => targetUser && onStartCallWithUser?.(targetUser, true)}
                      className="p-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] hover:text-white transition cursor-pointer"
                      title="Видеозвонок"
                    >
                      <Video className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => targetUser && onToggleFollow?.(targetUser.id)}
                      className={`px-3.5 py-2 rounded-xl border text-xs sm:text-[13px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        isFollowing
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#2c2d2e] hover:bg-[#363738] border-transparent text-white'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isFollowing ? 'В друзьях' : 'Подписаться'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio / Status Line */}
            <p className="text-xs sm:text-[13px] text-[#e1e3e6] leading-relaxed mt-3 text-center sm:text-left">
              {activeProfileUser.bio || 'Пользователь платформы AuraChat. Скорость, дизайн и безопасность.'}
            </p>

            {/* Extra Actions & Counters Row in VK Style */}
            <div className="mt-4 pt-3.5 border-t border-[#2e2e2e] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-5 text-xs">
                <button
                  onClick={() => setActiveTab('posts')}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-white"
                >
                  <span className="font-bold text-white text-sm">{myPosts.length}</span>
                  <span className="text-[#939393]">записей</span>
                </button>

                <button
                  onClick={() => setActiveTab('reels')}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-white"
                >
                  <span className="font-bold text-white text-sm">{myReels.length}</span>
                  <span className="text-[#939393]">клипов</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm">{subscribersCount}</span>
                  <span className="text-[#939393]">подписчиков</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#0077FF]/15 hover:bg-[#0077FF]/25 text-[#71aaeb] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Приложение</span>
                </button>

                {isCleanNewProfile ? (
                  onLoadDemoProfile && (
                    <button
                      onClick={onLoadDemoProfile}
                      className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-medium cursor-pointer"
                    >
                      Демо-данные
                    </button>
                  )
                ) : (
                  onResetToNewProfile && (
                    <button
                      onClick={onResetToNewProfile}
                      className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white text-xs font-medium cursor-pointer"
                    >
                      Чистый профиль
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* VK Content Tabs Bar (Записи, Клипы, Репосты, Закладки) */}
        <div className="p-2 rounded-2xl bg-[#222222] border border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'posts'
                  ? 'bg-[#2c2d2e] text-white border border-[#3a3b3c]'
                  : 'text-[#939393] hover:text-white hover:bg-[#292929]'
              }`}
            >
              <Grid className="w-4 h-4 text-[#71aaeb]" />
              <span>Записи</span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reels'
                  ? 'bg-[#2c2d2e] text-white border border-[#3a3b3c]'
                  : 'text-[#939393] hover:text-white hover:bg-[#292929]'
              }`}
            >
              <Film className="w-4 h-4 text-[#71aaeb]" />
              <span>Клипы</span>
            </button>

            <button
              onClick={() => setActiveTab('reposts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'reposts'
                  ? 'bg-[#2c2d2e] text-white border border-[#3a3b3c]'
                  : 'text-[#939393] hover:text-white hover:bg-[#292929]'
              }`}
            >
              <Repeat className="w-4 h-4 text-[#71aaeb]" />
              <span>Репосты</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-[#2c2d2e] text-white border border-[#3a3b3c]'
                  : 'text-[#939393] hover:text-white hover:bg-[#292929]'
              }`}
            >
              <Bookmark className="w-4 h-4 text-[#71aaeb]" />
              <span>Закладки</span>
            </button>
          </div>

          <button
            onClick={onOpenStudio}
            className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Опубликовать</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: ПОСТЫ ПОЛЬЗОВАТЕЛЯ (POSTS GRID)                              */}
        {/* =================================================================== */}
        {activeTab === 'posts' && (
          <div>
            {myPosts.length === 0 ? (
              <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#202b36] mx-auto flex items-center justify-center text-slate-400">
                  <Grid className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-white">Вы еще не выложили посты</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Нажмите кнопку ниже, чтобы снять фото или прикрепить до 10 (или до 35) фотографий с музыкой.
                </p>
                <button
                  onClick={onOpenStudio}
                  className="px-5 py-2.5 rounded-full bg-[#5288c1] text-white text-xs font-bold hover:bg-blue-500 shadow-md transition cursor-pointer"
                >
                  + Опубликовать первый пост
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {myPosts.map((post) => {
                  const imagesCount = post.images?.filter(Boolean).length || (post.mediaUrl ? 1 : 0);
                  const hasMedia = imagesCount > 0 && !!post.mediaUrl;
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square bg-black rounded-2xl overflow-hidden border border-[#243344] cursor-pointer"
                    >
                      {hasMedia ? (
                        isVideoMedia(post.mediaUrl, post.mediaType) ? (
                          <video
                            src={post.mediaUrl}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        )
                      ) : (
                        <div className="w-full h-full p-3 bg-gradient-to-br from-[#1b2736] to-[#131c26] flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] text-[#64b5f6]">
                            <FileText className="w-4 h-4" />
                            {post.linkUrl && <Link2 className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[11px] text-slate-200 line-clamp-3 font-medium">
                            {post.caption}
                          </p>
                        </div>
                      )}

                      {/* Multi-photo badge */}
                      {imagesCount > 1 && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white flex items-center gap-1 border border-white/10">
                          <Layers className="w-3 h-3 text-[#64b5f6]" />
                          <span>{imagesCount}</span>
                          {imagesCount > 10 && <span className="text-amber-400">★</span>}
                        </div>
                      )}

                      {/* Music badge */}
                      {post.music && (
                        <div className="absolute bottom-2 left-2 p-1 rounded-md bg-black/70 backdrop-blur-md text-[#64b5f6] border border-white/10" title={post.music.title}>
                          <Music className="w-3 h-3" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white text-xs font-bold font-mono">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-current text-rose-500" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 fill-current text-blue-400" />
                          <span>{post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ВИДЕО МОМЕНТЫ (REELS)                                        */}
        {/* =================================================================== */}
        {activeTab === 'reels' && (
          <div>
            {myReels.length === 0 ? (
              <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#202b36] mx-auto flex items-center justify-center text-slate-400">
                  <Film className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-white">Нет видео моментов Reels</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Снимите вертикальное видео с регулировкой скорости (0.5x-2x) и фильтрами.
                </p>
                <button
                  onClick={onOpenStudio}
                  className="px-5 py-2.5 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shadow-md transition cursor-pointer"
                >
                  + Снять Reels
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {myReels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => setSelectedPost(reel)}
                    className="group relative aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-[#243344] cursor-pointer"
                  >
                    {isVideoMedia(reel.mediaUrl, reel.mediaType) ? (
                      <video
                        src={reel.mediaUrl}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <img
                        src={reel.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                      <div className="self-end px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-emerald-300">
                        {reel.quality || '1080p'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Play className="w-3.5 h-3.5 fill-current text-rose-500" />
                          <span>{reel.viewsCount ?? 0} просмотров</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-1">{reel.caption}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: РЕПОСТЫ (REPOSTS GRID)                                       */}
        {/* =================================================================== */}
        {activeTab === 'reposts' && (
          <div>
            {myReposts.length === 0 ? (
              <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#202b36] mx-auto flex items-center justify-center text-slate-400">
                  <Repeat className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-white">У вас пока нет репостов</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Нажмите кнопку поделиться / репост на любом посте или видео Reels, чтобы они появились в вашем профиле.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {myReposts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPost(item)}
                    className="group relative aspect-square bg-black rounded-2xl overflow-hidden border border-[#243344] cursor-pointer"
                  >
                    <img
                      src={item.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                      <div className="self-end px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        <span>Репост</span>
                      </div>
                      <p className="text-[11px] text-slate-200 line-clamp-1">{item.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: ИЗБРАННОЕ / СОХРАНЕННОЕ                                      */}
        {/* =================================================================== */}
        {activeTab === 'saved' && (
          <div>
            {mySavedPosts.length === 0 ? (
              <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#202b36] mx-auto flex items-center justify-center text-slate-400">
                  <Bookmark className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-white">У вас нет сохраненных публикаций</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Нажмите на значок закладки под постом или Reels, чтобы сохранить его в этот раздел.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {mySavedPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="group relative aspect-square bg-black rounded-2xl overflow-hidden border border-[#243344] cursor-pointer"
                  >
                    {isVideoMedia(post.mediaUrl, post.mediaType) ? (
                      <video
                        src={post.mediaUrl}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    )}
                    <div className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-amber-400">
                      <Bookmark className="w-3 h-3 fill-current" />
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white text-xs font-bold font-mono">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-current text-rose-500" />
                        <span>{post.likesCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 fill-current text-blue-400" />
                        <span>{post.comments.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: POST DETAIL VIEWER WITH REAL LIKES, VIEWS & COMMENTS */}
      {liveSelectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#222222] border border-[#2e2e2e] rounded-2xl overflow-hidden w-full max-w-md text-[#e1e3e6] shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="p-3.5 flex items-center justify-between border-b border-[#2e2e2e] shrink-0">
              <div className="flex items-center gap-2">
                <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <div className="font-bold text-xs text-white">{currentUser.displayName}</div>
                  <div className="text-[11px] text-[#828282]">{formatSmartTime(liveSelectedPost.createdAt, liveSelectedPost.id, nowTick)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {liveSelectedPost.mediaUrl && (
                  <button
                    onClick={() =>
                      downloadMediaFile(
                        liveSelectedPost.mediaUrl,
                        `aurachat_${liveSelectedPost.id}`,
                        liveSelectedPost.type === 'reel' || liveSelectedPost.mediaType === 'video' ? 'video' : 'image'
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-[#828282] hover:text-white p-1.5 rounded-lg bg-[#2c2d2e] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {liveSelectedPost.mediaUrl ? (
                <div className="aspect-square bg-black overflow-hidden relative">
                  {isVideoMedia(liveSelectedPost.mediaUrl, liveSelectedPost.mediaType) ? (
                    <video
                      src={liveSelectedPost.mediaUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={liveSelectedPost.mediaUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                  {liveSelectedPost.music && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] text-white flex items-center gap-1.5 border border-white/10">
                      <Music className="w-3.5 h-3.5 text-[#71aaeb]" />
                      <span>{liveSelectedPost.music.artist} — {liveSelectedPost.music.title}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 bg-[#19191a] border-b border-[#2e2e2e]">
                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{liveSelectedPost.caption}</p>
                </div>
              )}

              <div className="p-4 space-y-3">
                {liveSelectedPost.mediaUrl && liveSelectedPost.caption && (
                  <p className="text-xs text-[#e1e3e6]">{liveSelectedPost.caption}</p>
                )}

                {liveSelectedPost.linkUrl && (
                  <a
                    href={liveSelectedPost.linkUrl.startsWith('http') ? liveSelectedPost.linkUrl : `https://${liveSelectedPost.linkUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between text-xs text-[#71aaeb] hover:bg-[#2c2d2e] transition"
                  >
                    <span className="truncate font-mono">{liveSelectedPost.linkTitle || liveSelectedPost.linkUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
                  </a>
                )}

                {/* Real Likes, Comments & Views Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playReactionSound();
                        onToggleLikePost?.(liveSelectedPost.id);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        liveSelectedPost.isLiked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liveSelectedPost.isLiked ? 'fill-current text-rose-500' : ''}`} />
                      <span>{liveSelectedPost.likesCount}</span>
                    </button>

                    <div className="px-3 py-1.5 rounded-full bg-[#2c2d2e] text-[#939393] text-xs font-semibold flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      <span>{liveSelectedPost.comments.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-[#828282]">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{liveSelectedPost.viewsCount ?? 0}</span>
                  </div>
                </div>

                {/* Comments List */}
                <div className="pt-2 border-t border-[#2e2e2e] space-y-2">
                  {liveSelectedPost.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#71aaeb]">{c.userName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#828282]">{formatSmartTime(c.createdAt, c.id, nowTick)}</span>
                          {onDeleteComment && (
                            <button
                              onClick={() => onDeleteComment(liveSelectedPost.id, c.id)}
                              className="text-[#828282] hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[#e1e3e6]">{c.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comment Input Bar */}
            <div className="p-3 border-t border-[#2e2e2e] bg-[#222222] flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Написать комментарий..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    playSentSound();
                    onAddComment?.(liveSelectedPost.id, {
                      id: 'c_prof_' + Date.now(),
                      userId: currentUser.id,
                      userName: currentUser.displayName,
                      userAvatar: currentUser.avatarUrl,
                      content: commentText.trim(),
                      createdAt: new Date().toISOString(),
                      likesCount: 0
                    });
                    setCommentText('');
                  }
                }}
                className="flex-1 bg-[#2c2d2e] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#0077FF] border border-transparent placeholder-[#828282]"
              />
              <button
                onClick={() => {
                  if (!commentText.trim()) return;
                  playSentSound();
                  onAddComment?.(liveSelectedPost.id, {
                    id: 'c_prof_' + Date.now(),
                    userId: currentUser.id,
                    userName: currentUser.displayName,
                    userAvatar: currentUser.avatarUrl,
                    content: commentText.trim(),
                    createdAt: new Date().toISOString(),
                    likesCount: 0
                  });
                  setCommentText('');
                }}
                className="p-2 bg-[#0077FF] hover:bg-[#0066DD] rounded-lg text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#17212b] border border-[#243344] rounded-3xl p-6 w-full max-w-xs text-center space-y-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#243344]">
              <h3 className="font-bold text-sm">QR-код профиля</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-inner">
              <div className="w-full h-full border-4 border-slate-900 rounded-lg p-2 flex flex-col items-center justify-center relative">
                <QrCode className="w-28 h-28 text-slate-900" />
                <div className="w-7 h-7 rounded-full bg-[#5288c1] border-2 border-white absolute flex items-center justify-center text-white text-[10px] font-bold">
                  AC
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold text-xs">{currentUser.displayName}</div>
              <div className="text-[11px] text-slate-400">aurachat.app/@{currentUser.username}</div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-[#5288c1] rounded-xl text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* MODAL: КТО ЗАХОДИЛ (VISITORS POPUP) */}
      {showVisitorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#17212b] border border-[#243344] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#243344]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Кто заходил в ваш профиль</h3>
                  <p className="text-[11px] text-slate-400">Статистика гостей ({visitors.length})</p>
                </div>
              </div>
              <button
                onClick={() => setShowVisitorsModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#202b36] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#202b36] pr-1 scrollbar-thin">
              {visitors.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Пока никто не заходил в ваш профиль.
                </div>
              ) : (
                visitors.map((visitor) => (
                  <div key={visitor.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={visitor.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <div className="font-bold text-xs">{visitor.userName}</div>
                        <div className="text-[10px] text-slate-400">Заходил(а): {visitor.visitedAt}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-[10px] text-amber-300 font-mono">
                      {visitor.viewCount} раз
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowVisitorsModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#5288c1] hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* MODAL: СВОЯ АВАТАРКА (ВЫБОР С УСТРОЙСТВА / КАМЕРА / ССЫЛКА) */}
      <AvatarEditorModal
        isOpen={showAvatarEditor}
        currentAvatarUrl={currentUser.avatarUrl}
        displayName={currentUser.displayName}
        onClose={() => setShowAvatarEditor(false)}
        onSaveAvatar={(newAvatarUrl) => {
          if (onUpdateUser) {
            onUpdateUser({ avatarUrl: newAvatarUrl });
            playSentSound();
          }
        }}
      />

      {/* MODAL: УСТАНОВКА ПРИЛОЖЕНИЯ (ПК / ANDROID APK / IOS ИНСТРУКЦИЯ) */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
