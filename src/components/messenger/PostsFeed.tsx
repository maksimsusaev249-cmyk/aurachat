import React, { useState, useEffect, useRef } from 'react';
import { Post, PostComment, CommunityGif, Chat, Community } from '../../types';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Trash2,
  Bookmark, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Music, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Layers,
  Image as ImageIcon,
  Smile,
  X,
  Upload,
  User as UserIcon,
  Download,
  ExternalLink,
  Link2,
  Search,
  BarChart2,
  FileText,
  Radio,
  Plus,
  Eye,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { playPostMusicTrack, stopPostMusicTrack, playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { isVideoMedia, fileToPersistentUrl } from '../../utils/mediaUtils';
import { formatSmartTime } from '../../utils/dateUtils';

import { ViewTargetUser } from './OtherUserProfileModal';
import { ShareReelModal } from './ShareReelModal';

interface PostsFeedProps {
  posts: Post[];
  chats?: Chat[];
  communities?: Community[];
  currentUserId?: string;
  initialFeedTab?: 'all' | 'communities';
  onSelectCommunity?: (community: Community) => void;
  onOpenCreateCommunity?: () => void;
  communityGifs?: CommunityGif[];
  onBackToChats: () => void;
  onOpenStudio?: () => void;
  followingUserIds?: Record<string, boolean>;
  onToggleFollow?: (userId: string) => void;
  onOpenUserProfile?: (user: ViewTargetUser) => void;
  onSendPostToChat?: (chatId: string, post: Post, customMsg?: string) => void;
  savedPostIds?: Record<string, boolean>;
  onToggleSave?: (postId: string) => void;
  onToggleLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, comment: PostComment) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onRefreshFeed?: () => void;
  refreshCount?: number;
}

const reactionGifs = [
  { id: 'g1', title: 'Огонь! 🔥', url: 'https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif' },
  { id: 'g2', title: 'Шок 😱', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif' },
  { id: 'g3', title: 'Класс 👍', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: 'g4', title: 'Кодинг 💻', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
  { id: 'g5', title: 'LOL 😂', url: 'https://media.giphy.com/media/xUA7aM09ByyR1w5gYG/giphy.gif' },
  { id: 'g6', title: 'Аплодисменты 👏', url: 'https://media.giphy.com/media/fnK0jeA8vIh2QLq3IZ/giphy.gif' }
];

export const PostsFeed: React.FC<PostsFeedProps> = ({ 
  posts, 
  chats = [],
  communities = [],
  currentUserId = 'usr_me',
  initialFeedTab = 'all',
  onSelectCommunity,
  onOpenCreateCommunity,
  communityGifs,
  onBackToChats, 
  onOpenStudio,
  followingUserIds = {},
  onToggleFollow,
  onOpenUserProfile,
  onSendPostToChat,
  savedPostIds = {},
  onToggleSave,
  onToggleLikePost,
  onAddComment,
  onDeleteComment,
  onRefreshFeed,
  refreshCount = 0
}) => {
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFreshBadge, setShowFreshBadge] = useState(false);

  // Feed Tab: 'all' | 'communities'
  const [feedTab, setFeedTab] = useState<'all' | 'communities'>(initialFeedTab);
  // Community Sub-Tab: 'subscribed' (На кого подписан) | 'unsubscribed' (На кого не подписан / Каталог)
  const [commSubTab, setCommSubTab] = useState<'subscribed' | 'unsubscribed'>('subscribed');
  const [commSearchQuery, setCommSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userPollVotes, setUserPollVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    setFeedTab(initialFeedTab);
  }, [initialFeedTab]);

  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  useEffect(() => {
    setIsRefreshing(true);
    setShowFreshBadge(true);
    setCurrentSlides({});
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const t1 = setTimeout(() => setIsRefreshing(false), 450);
    const t2 = setTimeout(() => setShowFreshBadge(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [refreshCount]);

  const handleManualRefresh = () => {
    playReactionSound();
    onRefreshFeed?.();
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    onDeleteComment?.(postId, commentId);
  };
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Comment media attachment state per post: { [postId]: { url: string; type: 'image' | 'gif' } | null }
  const [commentMedia, setCommentMedia] = useState<Record<string, { url: string; type: 'image' | 'gif' } | null>>({});
  const [activeGifPickerPostId, setActiveGifPickerPostId] = useState<string | null>(null);

  // Carousel active image index per post: { [postId]: number }
  const [currentSlides, setCurrentSlides] = useState<Record<string, number>>({});
  
  // Active playing music track: postId | null
  const [playingMusicPostId, setPlayingMusicPostId] = useState<string | null>(null);
  const [downloadingPostId, setDownloadingPostId] = useState<string | null>(null);

  const handleSharePost = (post: Post) => {
    setShareModalPost(post);
  };

  const handleShareComment = (commentId: string) => {
    const url = `${window.location.origin}/?comment=${commentId}`;
    navigator.clipboard.writeText(url);
  };

  const handleDownloadPostMedia = (post: Post, mediaUrl: string) => {
    if (!mediaUrl) return;
    setDownloadingPostId(post.id);
    downloadMediaFile(
      mediaUrl,
      `aurachat_post_${post.userName}_${post.id}`,
      post.mediaType === 'video' ? 'video' : 'image',
      (status) => {
        if (status === 'done') {
          setTimeout(() => setDownloadingPostId(null), 1500);
        }
      }
    );
  };

  const toggleBookmark = (id: string) => {
    onToggleSave?.(id);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Stop music on unmount
  useEffect(() => {
    return () => {
      stopPostMusicTrack();
    };
  }, []);

  const toggleLike = (id: string) => {
    playReactionSound();
    if (onToggleLikePost) {
      onToggleLikePost(id);
    } else {
      setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const toggleMusic = (post: Post) => {
    if (!post.music) return;

    if (playingMusicPostId === post.id) {
      stopPostMusicTrack();
      setPlayingMusicPostId(null);
    } else {
      setPlayingMusicPostId(post.id);
      playPostMusicTrack(post.music.genre || 'synthwave');
    }
  };

  const handlePrevSlide = (postId: string, total: number) => {
    setCurrentSlides((prev) => {
      const current = prev[postId] || 0;
      return {
        ...prev,
        [postId]: current === 0 ? total - 1 : current - 1
      };
    });
  };

  const handleNextSlide = (postId: string, total: number) => {
    setCurrentSlides((prev) => {
      const current = prev[postId] || 0;
      return {
        ...prev,
        [postId]: (current + 1) % total
      };
    });
  };

  // Add Comment with text, photo, or gif
  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim() || '';
    const attached = commentMedia[postId];

    // Must have either text or attached media
    if (!text && !attached) return;

    playSentSound();
    const newComment: PostComment = {
      id: 'c_' + Date.now(),
      userId: 'usr_me',
      userName: 'Александр',
      userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
      content: text || (attached?.type === 'gif' ? 'Отправил(а) гифку' : 'Отправил(а) фото'),
      mediaUrl: attached?.url,
      mediaType: attached?.type,
      createdAt: formatSmartTime(new Date()),
      likesCount: 0
    };

    onAddComment?.(postId, newComment);

    // Clear input and media
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setCommentMedia((prev) => ({ ...prev, [postId]: null }));
    setActiveGifPickerPostId(null);
  };

  // Attach photo to comment from file input
  const handleCommentPhotoUpload = async (postId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      e.target.value = '';
      playReactionSound();
      const converted = await fileToPersistentUrl(file);
      setCommentMedia((prev) => ({
        ...prev,
        [postId]: { url: converted.url, type: 'image' }
      }));
      setActiveGifPickerPostId(null);
    }
  };

  // Attach GIF to comment
  const handleSelectGif = (postId: string, gifUrl: string) => {
    playReactionSound();
    setCommentMedia((prev) => ({
      ...prev,
      [postId]: { url: gifUrl, type: 'gif' }
    }));
    setActiveGifPickerPostId(null);
  };

  // Web Quick Scroll Buttons
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 h-full bg-[#141414] overflow-y-auto p-3 sm:p-5 flex flex-col items-center select-none text-[#e1e3e6] scrollbar-thin relative min-h-0 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]"
    >
      <div className="w-full max-w-xl space-y-3.5 pb-16">
        {/* VKontakte Newsfeed Top Bar & Quick Composer ("Что у вас нового?") */}
        <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">AuraChat · Новости</h2>
              <span className="px-2 py-0.5 rounded-md bg-[#2c2d2e] text-[11px] text-[#939393]">
                Лента и сообщества
              </span>
              {showFreshBadge && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                  Лента обновлена
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                className="h-8 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold transition text-[#e1e3e6] flex items-center gap-1.5 cursor-pointer"
                title="Обновить ленту"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#71aaeb] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>
              {onOpenStudio && (
                <button
                  onClick={onOpenStudio}
                  className="h-8 px-3 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-xs font-semibold transition text-white flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Опубликовать</span>
                </button>
              )}
              <button
                onClick={onBackToChats}
                className="h-8 px-3 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#71aaeb] hover:text-white transition cursor-pointer flex items-center"
              >
                Мессенджер
              </button>
            </div>
          </div>

          {/* VK "Что у вас нового?" Composer Strip */}
          {onOpenStudio && (
            <div
              onClick={onOpenStudio}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] cursor-pointer transition"
            >
              <span className="text-xs text-[#828282]">Что у вас нового?</span>
              <div className="flex items-center gap-2 text-[#828282]">
                <ImageIcon className="w-4 h-4 hover:text-[#e1e3e6]" />
                <Music className="w-4 h-4 hover:text-[#e1e3e6]" />
              </div>
            </div>
          )}

          {/* VK Feed Category Tabs: Новости | Сообщества */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#2e2e2e]">
            <button
              onClick={() => {
                setFeedTab('all');
                onRefreshFeed?.();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                feedTab === 'all'
                  ? 'bg-[#2c2d2e] text-white'
                  : 'text-[#828282] hover:text-[#e1e3e6]'
              }`}
            >
              <span>Рекомендации</span>
            </button>

            <button
              onClick={() => setFeedTab('communities')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                feedTab === 'communities'
                  ? 'bg-[#2c2d2e] text-white'
                  : 'text-[#828282] hover:text-[#e1e3e6]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#71aaeb]" />
              <span>Сообщества</span>
            </button>
          </div>
        </div>

        {/* COMMUNITIES HUB SECTION (Список сообществ: Подписки / Не подписан / Поиск) */}
        {feedTab === 'communities' && (() => {
          const subscribedComms = communities.filter((c) =>
            c.subscribersUserIds.includes(currentUserId)
          );
          const unsubscribedComms = communities.filter(
            (c) => !c.subscribersUserIds.includes(currentUserId)
          );

          const isSearching = commSearchQuery.trim().length > 0;
          const baseList = isSearching
            ? communities
            : commSubTab === 'subscribed'
            ? subscribedComms
            : unsubscribedComms;

          const filteredComms = baseList.filter(
            (c) =>
              c.title.toLowerCase().includes(commSearchQuery.toLowerCase()) ||
              c.description.toLowerCase().includes(commSearchQuery.toLowerCase()) ||
              c.inviteCode.toLowerCase().includes(commSearchQuery.toLowerCase())
          );

          return (
            <div className="space-y-3">
              {/* Top Search & Create Community Bar */}
              <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white">Сообщества AuraChat</h3>
                    <p className="text-[11px] text-[#939393]">
                      Ваши подписки и каталог открытых и закрытых сообществ
                    </p>
                  </div>

                  {onOpenCreateCommunity && (
                    <button
                      onClick={onOpenCreateCommunity}
                      className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Создать сообщество</span>
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#828282]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Поиск сообществ по названию или описанию..."
                    value={commSearchQuery}
                    onChange={(e) => setCommSearchQuery(e.target.value)}
                    className="w-full bg-[#19191a] text-white text-xs rounded-xl pl-9 pr-8 py-2.5 outline-none placeholder-[#828282] border border-[#2e2e2e] focus:border-[#0077FF] transition"
                  />
                  {commSearchQuery && (
                    <button
                      onClick={() => setCommSearchQuery('')}
                      className="absolute right-2.5 top-2.5 p-1 text-[#828282] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-tabs: Мои подписки vs Не подписан (Каталог) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCommSubTab('subscribed');
                      setCommSearchQuery('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSearching && commSubTab === 'subscribed'
                        ? 'bg-[#0077FF] text-white'
                        : 'bg-[#2c2d2e] text-[#e1e3e6] hover:bg-[#363738]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Мои подписки</span>
                  </button>

                  <button
                    onClick={() => {
                      setCommSubTab('unsubscribed');
                      setCommSearchQuery('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSearching && commSubTab === 'unsubscribed'
                        ? 'bg-[#0077FF] text-white'
                        : 'bg-[#2c2d2e] text-[#e1e3e6] hover:bg-[#363738]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Не подписан</span>
                  </button>
                </div>
              </div>

              {/* Empty state when user has 0 subscriptions */}
              {!isSearching && commSubTab === 'subscribed' && subscribedComms.length === 0 && (
                <div className="p-6 text-center bg-[#222222] rounded-2xl border border-[#2e2e2e] space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      Пока нет сообществ
                    </h4>
                    <p className="text-xs text-[#939393] max-w-sm mx-auto leading-relaxed">
                      Создайте своё сообщество или найдите существующее через поиск.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {onOpenCreateCommunity && (
                      <button
                        onClick={onOpenCreateCommunity}
                        className="px-4 py-2 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Создать сообщество</span>
                      </button>
                    )}
                    <button
                      onClick={() => setCommSubTab('unsubscribed')}
                      className="px-4 py-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-semibold cursor-pointer transition"
                    >
                      Каталог сообществ
                    </button>
                  </div>
                </div>
              )}

              {/* Communities Cards List */}
              <div className="space-y-2.5">
                {filteredComms.map((comm) => {
                  const isSub = comm.subscribersUserIds.includes(currentUserId);
                  const hasPendingReq = (comm.joinRequests || []).some(
                    (r) => r.userId === currentUserId
                  );

                  return (
                    <div
                      key={comm.id}
                      onClick={() => onSelectCommunity?.(comm)}
                      className="p-4 rounded-2xl bg-[#222222] border border-[#2e2e2e] hover:border-[#0077FF]/60 transition flex flex-col gap-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={comm.avatarUrl}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover border border-[#2e2e2e]"
                            />
                            {comm.isPrivate && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-[#141414] border border-[#2e2e2e] text-amber-400"
                                title="Закрытое сообщество"
                              >
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="font-bold text-sm text-white truncate">
                                {comm.title}
                              </h3>
                              {comm.isPrivate ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Закрытое сообщество</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-[#2c2d2e] text-[#71aaeb] text-[10px] font-medium flex items-center gap-1 shrink-0">
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>Открытое</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#828282] mt-0.5">
                              {comm.subscribersCount} подписчик(ов) • Владелец: {comm.ownerName}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCommunity?.(comm);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            isSub
                              ? 'bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb]'
                              : hasPendingReq
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                          }`}
                        >
                          {isSub ? (
                            <span>Открыть</span>
                          ) : hasPendingReq ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Заявка отправлена</span>
                            </>
                          ) : comm.isPrivate ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Открыть (Закрытое)</span>
                            </>
                          ) : (
                            <span>Перейти</span>
                          )}
                        </button>
                      </div>

                      {comm.description && (
                        <p className="text-xs text-[#e1e3e6] line-clamp-2 bg-[#19191a] p-2.5 rounded-xl border border-[#2e2e2e]">
                          {comm.description}
                        </p>
                      )}
                    </div>
                  );
                })}

                {filteredComms.length === 0 && (isSearching || commSubTab === 'unsubscribed') && (
                  <div className="p-8 text-center text-[#828282] text-xs bg-[#222222] rounded-2xl border border-[#2e2e2e]">
                    Пока нет доступных сообществ.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Empty state when no user posts exist yet */}
        {feedTab === 'all' && localPosts.length === 0 && (
          <div className="p-8 text-center bg-[#222222] rounded-2xl border border-[#2e2e2e] space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2c2d2e] text-[#71aaeb] flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                Пока нет записей
              </h4>
              <p className="text-xs text-[#939393] max-w-md mx-auto leading-relaxed">
                Опубликуйте первую запись с фото, музыкой, опросом или видео.
              </p>
            </div>
            {onOpenStudio && (
              <div className="pt-1">
                <button
                  onClick={onOpenStudio}
                  className="px-4 py-2 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Опубликовать</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* VK Wall Posts List (Shown on 'all' tab) */}
        {feedTab === 'all' && localPosts.map((post) => {
          const rawImages = post.images && post.images.length > 0 ? post.images : post.mediaUrl ? [post.mediaUrl] : [];
          const imagesList = rawImages.filter(Boolean);
          const totalImages = imagesList.length;
          const hasMedia = totalImages > 0;
          const currentSlide = currentSlides[post.id] || 0;
          const isPlayingMusic = playingMusicPostId === post.id;
          const currentAttachedMedia = commentMedia[post.id];
          const isGifPickerOpen = activeGifPickerPostId === post.id;

          return (
            <div
              key={post.id}
              className="bg-[#222222] border border-[#2e2e2e] rounded-2xl overflow-hidden relative"
            >
              {/* VK Post Header: Author & Subscribe Button */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.userAvatar}
                    alt={post.userName}
                    onClick={() => onOpenUserProfile?.({
                      id: post.userId || 'u_' + post.userName,
                      name: post.userName,
                      username: post.userName.toLowerCase().replace(/\s+/g, '_'),
                      avatar: post.userAvatar
                    })}
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    title="Открыть профиль"
                  />
                  <div>
                    <div className="font-semibold text-[13px] text-white flex items-center gap-2">
                      <button
                        onClick={() => onOpenUserProfile?.({
                          id: post.userId || 'u_' + post.userName,
                          name: post.userName,
                          username: post.userName.toLowerCase().replace(/\s+/g, '_'),
                          avatar: post.userAvatar
                        })}
                        className="hover:underline hover:text-[#71aaeb] transition text-left cursor-pointer"
                      >
                        {post.userName}
                      </button>

                      {post.communityTitle && onSelectCommunity && (
                        <button
                          onClick={() => {
                            const comm = communities.find((c) => c.id === post.communityId || c.title === post.communityTitle) || communities[0];
                            if (comm) onSelectCommunity(comm);
                          }}
                          className="text-[11px] font-medium text-[#71aaeb] hover:underline cursor-pointer"
                        >
                          в {post.communityTitle}
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-[#828282]">{formatSmartTime(post.createdAt)}</div>
                  </div>
                </div>

                {/* VK Follow Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playReactionSound();
                    onToggleFollow?.(post.userId || 'u_' + post.userName);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    followingUserIds[post.userId || 'u_' + post.userName]
                      ? 'bg-[#2c2d2e] text-[#939393] hover:bg-[#363738]'
                      : 'bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb]'
                  }`}
                >
                  {followingUserIds[post.userId || 'u_' + post.userName] ? 'Вы подписаны' : 'Подписаться'}
                </button>
              </div>

              {/* VK Post Caption (shown ABOVE media like authentic VKontakte) */}
              {post.caption && (
                <div className="px-3.5 pb-3">
                  <p className="text-[13px] text-[#e1e3e6] leading-relaxed whitespace-pre-wrap break-words">
                    {post.caption}
                  </p>
                </div>
              )}

              {/* Media Carousel Area */}
              {hasMedia && (
                <div 
                  className={`relative bg-black overflow-hidden group w-full ${
                    post.aspectRatio === '3:4'
                      ? 'aspect-[3/4] max-h-[520px]'
                      : post.aspectRatio === '9:16' || post.aspectRatio === 'full'
                      ? 'aspect-[9/16] max-h-[520px]'
                      : post.aspectRatio === '4:5'
                      ? 'aspect-[4/5] max-h-[480px]'
                      : post.aspectRatio === '16:9'
                      ? 'aspect-video'
                      : 'aspect-square'
                  }`}
                >
                  {isVideoMedia(imagesList[currentSlide], post.mediaType) ? (
                    <video
                      src={imagesList[currentSlide]}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <img
                      src={imagesList[currentSlide]}
                      alt=""
                      className="w-full h-full object-cover select-none"
                    />
                  )}

                  {/* Quick Download Button on Media */}
                  <button
                    onClick={() => handleDownloadPostMedia(post, imagesList[currentSlide])}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-[#0077FF] text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/15 transition cursor-pointer z-10"
                    title="Скачать фото или видео на устройство"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingPostId === post.id ? 'Загрузка...' : 'Скачать'}</span>
                  </button>

                  {/* Multiple Images Counter Badge */}
                  {totalImages > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-[11px] font-semibold text-white flex items-center gap-1.5 z-10">
                      <span>
                        {currentSlide + 1} / {totalImages}
                      </span>
                    </div>
                  )}

                  {totalImages > 1 && (
                    <button
                      onClick={() => handlePrevSlide(post.id, totalImages)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer z-10"
                      title="Предыдущее фото"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  {totalImages > 1 && (
                    <button
                      onClick={() => handleNextSlide(post.id, totalImages)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition cursor-pointer z-10"
                      title="Следующее фото"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Thumbnails strip for multi-photo posts */}
              {totalImages > 2 && (
                <div className="px-3.5 py-2 bg-[#19191a] border-t border-[#2e2e2e] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {imagesList.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setCurrentSlides((prev) => ({ ...prev, [post.id]: idx }))
                      }
                      className={`relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        currentSlide === idx
                          ? 'border-[#0077FF]'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Attachments & VK Bottom Action Pills */}
              <div className="p-3.5 space-y-3">
                {/* Poll Card */}
                {post.poll && (
                  <div className="p-3.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] space-y-2.5">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-[#71aaeb]" />
                      <span>{post.poll.question}</span>
                    </div>

                    <div className="space-y-1.5">
                      {post.poll.options.map((opt, idx) => {
                        const total = (post.poll?.totalVotes || 0) + (userPollVotes[post.id] !== undefined ? 1 : 0);
                        const isVoted = userPollVotes[post.id] === idx;
                        const votes = opt.votes + (isVoted ? 1 : 0);
                        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              playReactionSound();
                              setUserPollVotes((prev) => ({ ...prev, [post.id]: idx }));
                            }}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium relative overflow-hidden transition cursor-pointer flex items-center justify-between ${
                              isVoted
                                ? 'bg-[#0077FF]/20 border-[#0077FF] text-white font-semibold'
                                : 'bg-[#222222] border-[#2e2e2e] hover:bg-[#2c2d2e] text-[#e1e3e6]'
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-[#0077FF]/20 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="relative z-10">{opt.text}</span>
                            <span className="relative z-10 text-[11px] font-semibold text-[#71aaeb]">{pct}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Attached Document File */}
                {post.attachedFile && (
                  <div className="p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#71aaeb] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{post.attachedFile.name}</div>
                        <div className="text-[10px] text-[#828282]">{post.attachedFile.size || 'Документ'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => downloadMediaFile(post.attachedFile!.url, post.attachedFile!.name, 'image')}
                      className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать</span>
                    </button>
                  </div>
                )}

                {/* Attached Link Card */}
                {post.linkUrl && (
                  <a
                    href={post.linkUrl.startsWith('http') ? post.linkUrl : `https://${post.linkUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#19191a] hover:bg-[#2c2d2e] border border-[#2e2e2e] flex items-center justify-between gap-3 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-[#2c2d2e] text-[#71aaeb] shrink-0">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {post.linkTitle || 'Ссылка'}
                        </div>
                        <div className="text-[11px] text-[#71aaeb] truncate">
                          {post.linkUrl}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#828282] shrink-0" />
                  </a>
                )}

                {/* Attached VK Music Track */}
                {post.music && (
                  <div 
                    onClick={() => toggleMusic(post)}
                    className="p-2.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between text-xs text-[#e1e3e6] cursor-pointer hover:bg-[#2c2d2e] transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-full bg-[#0077FF] text-white">
                        {isPlayingMusic ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">
                          {post.music.artist} — {post.music.title}
                        </div>
                        <div className="text-[11px] text-[#828282]">
                          AuraChat Музыка • {post.music.duration}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#71aaeb] font-medium">
                      {isPlayingMusic ? 'Играет' : 'Слушать'}
                    </span>
                  </div>
                )}

                {/* VKontakte Pill Actions Row (Нравится, Комментарий, Поделиться, Закладка + Просмотры) */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        (post.isLiked !== undefined ? post.isLiked : likedPosts[post.id])
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-[#e1e3e6]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          (post.isLiked !== undefined ? post.isLiked : likedPosts[post.id]) ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                      <span>
                        {(post.isLiked !== undefined
                          ? post.likesCount
                          : post.likesCount + (likedPosts[post.id] ? 1 : 0)
                        ).toLocaleString()}
                      </span>
                    </button>

                    <button className="px-3.5 py-1.5 rounded-full bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-[#e1e3e6] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </button>

                    <button 
                      onClick={() => handleSharePost(post)}
                      className="px-3.5 py-1.5 rounded-full bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-[#e1e3e6] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Поделиться записью"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-[#828282]" title="Просмотры записи">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{post.viewsCount ?? 0}</span>
                    </div>

                    <button 
                      onClick={() => toggleBookmark(post.id)}
                      className={`p-2 rounded-full transition cursor-pointer ${
                        savedPostIds[post.id]
                          ? 'text-[#0077FF] bg-[#0077FF]/15'
                          : 'text-[#828282] hover:text-[#e1e3e6] hover:bg-[#2c2d2e]'
                      }`}
                      title="В закладки"
                    >
                      <Bookmark className={`w-4 h-4 ${savedPostIds[post.id] ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* VK Comments Section */}
                <div className="pt-2.5 border-t border-[#2e2e2e] space-y-2.5">
                  {post.comments.map((c) => (
                    <div key={c.id} className="text-xs bg-[#19191a] p-2.5 rounded-xl border border-[#2e2e2e] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#71aaeb] text-xs flex items-center gap-1.5">
                          {c.userName}
                          {c.mediaType === 'gif' && (
                            <span className="px-1.5 py-0.2 rounded bg-[#2c2d2e] text-[#939393] text-[9px] font-mono">
                              GIF
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#828282]">{formatSmartTime(c.createdAt)}</span>
                          <button 
                            onClick={() => handleShareComment(c.id)}
                            className="p-1 rounded hover:bg-[#2c2d2e] text-[#828282] hover:text-white transition cursor-pointer"
                            title="Поделиться комментарием"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(post.id, c.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-[#828282] hover:text-rose-400 transition cursor-pointer"
                            title="Удалить комментарий"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {c.content && (
                        <div className="text-[#e1e3e6]">{c.content}</div>
                      )}

                      {c.mediaUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden max-h-48 max-w-xs border border-[#2e2e2e] bg-black">
                          <img
                            src={c.mediaUrl}
                            alt="Comment attachment"
                            className="w-full h-full object-cover max-h-48"
                          />
                        </div>
                      )}

                      {c.replies?.map((r) => (
                        <div key={r.id} className="mt-2 pl-3 border-l-2 border-[#0077FF] text-[#e1e3e6]">
                          <div className="font-semibold text-[#71aaeb] text-[11px]">{r.userName}</div>
                          <div>{r.content}</div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Attached Media Preview Chip */}
                  {currentAttachedMedia && (
                    <div className="flex items-center gap-2 p-2 bg-[#19191a] border border-[#2e2e2e] rounded-xl w-fit">
                      <img
                        src={currentAttachedMedia.url}
                        alt="Attached preview"
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                      <span className="text-[11px] text-[#e1e3e6]">
                        {currentAttachedMedia.type === 'gif' ? 'Прикреплена GIF' : 'Прикреплено фото'}
                      </span>
                      <button
                        onClick={() => setCommentMedia((prev) => ({ ...prev, [post.id]: null }))}
                        className="p-1 rounded-full hover:bg-[#2c2d2e] text-[#828282] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick GIF Picker Tray Drawer */}
                  {isGifPickerOpen && (
                    <div className="p-3 bg-[#19191a] border border-[#2e2e2e] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#e1e3e6]">
                        <span>Каталог GIF AuraChat</span>
                        <button
                          onClick={() => setActiveGifPickerPostId(null)}
                          className="text-[#828282] hover:text-white p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                        {(communityGifs && communityGifs.length > 0 ? communityGifs : reactionGifs).map((gif: any) => (
                          <div
                            key={gif.id}
                            onClick={() => handleSelectGif(post.id, gif.url)}
                            className="relative aspect-video rounded-lg overflow-hidden border border-[#2e2e2e] hover:border-[#0077FF] cursor-pointer group bg-black"
                          >
                            <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 flex flex-col justify-end">
                              <span className="text-[10px] font-semibold text-white truncate">
                                {gif.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VK Comment Input Bar */}
                  <div className="pt-1 flex items-center gap-2">
                    <label 
                      className="p-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#828282] hover:text-white transition cursor-pointer shrink-0"
                      title="Прикрепить фото к комментарию"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCommentPhotoUpload(post.id, e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={() =>
                        setActiveGifPickerPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                        isGifPickerOpen
                          ? 'bg-[#0077FF] text-white'
                          : 'bg-[#2c2d2e] text-[#939393] hover:bg-[#363738] hover:text-white'
                      }`}
                      title="Выбрать GIF"
                    >
                      GIF
                    </button>

                    <input
                      type="text"
                      placeholder="Написать комментарий..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      className="flex-1 bg-[#2c2d2e] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#0077FF] border border-transparent placeholder-[#828282] transition"
                    />

                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="p-2 bg-[#0077FF] hover:bg-[#0066DD] rounded-lg text-white cursor-pointer transition shrink-0"
                      title="Отправить комментарий"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP QUICK SCROLL CONTROLS */}
      <div className="hidden sm:flex flex-col gap-2 fixed right-6 bottom-10 z-40 select-none">
        <button
          onClick={scrollToTop}
          className="p-2.5 rounded-full bg-[#222222] hover:bg-[#2c2d2e] border border-[#2e2e2e] text-[#e1e3e6] shadow-xl transition cursor-pointer"
          title="Наверх"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={scrollToBottom}
          className="p-2.5 rounded-full bg-[#222222] hover:bg-[#2c2d2e] border border-[#2e2e2e] text-[#e1e3e6] shadow-xl transition cursor-pointer"
          title="Вниз"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Share Post Modal */}
      <ShareReelModal
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
        reel={shareModalPost}
        chats={chats}
        onSendToChat={(chatId, post, customMsg) => {
          onSendPostToChat?.(chatId, post, customMsg);
          setShareModalPost(null);
        }}
      />
    </div>
  );
};
