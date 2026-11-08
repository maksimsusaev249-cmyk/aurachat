import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../../types';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  Trash2,
  Volume2, 
  VolumeX, 
  Send, 
  ChevronUp, 
  ChevronDown,
  Sparkles,
  UserPlus,
  Download,
  RefreshCw
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { isVideoMedia } from '../../utils/mediaUtils';
import { formatSmartTime } from '../../utils/dateUtils';

import { ViewTargetUser } from './OtherUserProfileModal';
import { ShareReelModal } from './ShareReelModal';
import { Chat } from '../../types';

interface ReelsFeedProps {
  reels: Post[];
  chats?: Chat[];
  onBackToChats: () => void;
  onOpenStudio?: () => void;
  followingUserIds?: Record<string, boolean>;
  onToggleFollow?: (userId: string) => void;
  onOpenUserProfile?: (user: ViewTargetUser) => void;
  onSendToChat?: (chatId: string, reel: Post, customMsg?: string) => void;
  savedPostIds?: Record<string, boolean>;
  onToggleSave?: (postId: string) => void;
  onToggleLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, comment: any) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onRefreshReels?: () => void;
  refreshCount?: number;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({ 
  reels, 
  chats = [],
  onBackToChats, 
  onOpenStudio,
  followingUserIds = {},
  onToggleFollow,
  onOpenUserProfile,
  onSendToChat,
  savedPostIds = {},
  onToggleSave,
  onToggleLikePost,
  onAddComment,
  onDeleteComment,
  onRefreshReels,
  refreshCount = 0
}) => {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    reels.forEach((r) => { map[r.id] = r.likesCount; });
    return map;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [heartAnimId, setHeartAnimId] = useState<string | null>(null);
  const [shareModalReel, setShareModalReel] = useState<Post | null>(null);
  const [downloadingReelId, setDownloadingReelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFreshBadge, setShowFreshBadge] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // TikTok-style Pull-to-Refresh state on the first reel
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const wheelCooldownRef = useRef<boolean>(false);
  const PULL_THRESHOLD = 52;

  const handleDownloadReel = (reel: Post) => {
    setDownloadingReelId(reel.id);
    downloadMediaFile(
      reel.mediaUrl,
      `chatix_reel_${reel.userName}_${reel.id}`,
      reel.mediaType === 'video' ? 'video' : 'image',
      (status) => {
        if (status === 'done') {
          setTimeout(() => setDownloadingReelId(null), 1500);
        }
      }
    );
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [videoFailedMap, setVideoFailedMap] = useState<Record<string, boolean>>({});
  const [imageFailedMap, setImageFailedMap] = useState<Record<string, boolean>>({});

  const totalReels = reels.length;

  // Ensure the active reel video plays smoothly (falling back to muted if browser blocks unmuted autoplay)
  useEffect(() => {
    reels.forEach((r, idx) => {
      const vid = videoRefs.current[r.id];
      if (!vid) return;
      if (idx === activeReelIndex) {
        vid.muted = isMuted;
        const p = vid.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            vid.muted = true;
            vid.play().catch(() => {});
          });
        }
      } else {
        try {
          vid.pause();
        } catch {}
      }
    });
  }, [activeReelIndex, reels, isMuted]);

  // Sync likes map whenever reels list rotates or updates
  useEffect(() => {
    const nextLiked: Record<string, boolean> = {};
    const nextCounts: Record<string, number> = {};
    reels.forEach((r) => {
      nextLiked[r.id] = Boolean(r.isLiked);
      nextCounts[r.id] = r.likesCount;
    });
    setLikedMap(nextLiked);
    setLikesCountMap(nextCounts);
  }, [reels]);

  // Reset to first fresh reel and animate refresh badge every time user visits or refreshes Reels
  useEffect(() => {
    setActiveReelIndex(0);
    setActiveCommentsReelId(null);
    setIsRefreshing(true);
    setShowFreshBadge(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    const t1 = setTimeout(() => setIsRefreshing(false), 450);
    const t2 = setTimeout(() => setShowFreshBadge(false), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [refreshCount]);

  // Trigger TikTok-style pull-to-refresh animation and content update
  const triggerTikTokRefresh = () => {
    if (isPullRefreshing) return;
    playReactionSound();
    setIsPullRefreshing(true);
    setPullDistance(68);
    setTimeout(() => {
      onRefreshReels?.();
      setIsPullRefreshing(false);
      setPullDistance(0);
    }, 650);
  };

  // Touch handlers for pulling the first video
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeReelIndex !== 0 || isPullRefreshing) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    if (scrollTop <= 5) {
      dragStartYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || dragStartYRef.current === null || activeReelIndex !== 0) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;
    // Pull down at the top of the first video
    if (deltaY > 0) {
      setPullDistance(Math.min(110, deltaY * 0.52));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartYRef.current = null;
    if (pullDistance >= PULL_THRESHOLD) {
      triggerTikTokRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Mouse drag handlers so pulling the first video up or down with the mouse also refreshes like TikTok
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeReelIndex !== 0 || isPullRefreshing) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    if (scrollTop <= 5) {
      dragStartYRef.current = e.clientY;
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || dragStartYRef.current === null || activeReelIndex !== 0) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const distance = Math.abs(deltaY);
    if (distance > 6) {
      setPullDistance(Math.min(110, distance * 0.55));
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartYRef.current = null;
    if (pullDistance >= PULL_THRESHOLD) {
      triggerTikTokRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Wheel overscroll at the top of the first video
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (activeReelIndex === 0 && (scrollContainerRef.current?.scrollTop || 0) <= 2 && e.deltaY < -35) {
      if (!wheelCooldownRef.current && !isPullRefreshing) {
        wheelCooldownRef.current = true;
        triggerTikTokRefresh();
        setTimeout(() => {
          wheelCooldownRef.current = false;
        }, 1200);
      }
    }
  };

  // Sync scroll position when index changes via keyboard or side buttons
  const scrollToReel = (index: number) => {
    if (index < 0 || index >= totalReels) return;
    const targetElement = reelRefs.current[index];
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: index * scrollContainerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
    setActiveReelIndex(index);
  };

  const handlePrevReel = () => {
    if (activeReelIndex > 0) {
      scrollToReel(activeReelIndex - 1);
    } else if (activeReelIndex === 0) {
      // If already on the 1st reel and pressing Up, trigger TikTok refresh
      triggerTikTokRefresh();
    }
  };

  const handleNextReel = () => {
    if (activeReelIndex < totalReels - 1) {
      scrollToReel(activeReelIndex + 1);
    }
  };

  // Detect active reel index on vertical scroll / snap
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    if (containerHeight > 0) {
      const index = Math.round(scrollTop / containerHeight);
      if (index >= 0 && index < totalReels && index !== activeReelIndex) {
        setActiveReelIndex(index);
      }
    }
  };

  // Keyboard navigation on Web (ArrowUp / ArrowDown / PageUp / PageDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in comment input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevReel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, totalReels, isPullRefreshing]);

  const handleToggleLike = (reelId: string) => {
    playReactionSound();
    if (onToggleLikePost) {
      onToggleLikePost(reelId);
    } else {
      const isLiked = likedMap[reelId];
      setLikedMap((prev) => ({ ...prev, [reelId]: !isLiked }));
      setLikesCountMap((prev) => ({
        ...prev,
        [reelId]: Math.max(0, (prev[reelId] || 0) + (isLiked ? -1 : 1))
      }));
    }
  };

  // Double tap to like animation
  const handleDoubleTap = (reelId: string) => {
    if (!likedMap[reelId]) {
      handleToggleLike(reelId);
    } else {
      playReactionSound();
    }
    setHeartAnimId(reelId);
    setTimeout(() => {
      setHeartAnimId(null);
    }, 700);
  };

  const toggleBookmark = (id: string) => {
    onToggleSave?.(id);
  };

  const handleAddComment = (reelId: string) => {
    if (!newCommentText.trim()) return;
    playSentSound();
    const newComment = {
      id: 'c_' + Date.now(),
      userId: 'usr_me',
      userName: 'Александр',
      userAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlexNova&backgroundColor=1e293b',
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0
    };
    onAddComment?.(reelId, newComment);
    setNewCommentText('');
  };

  const handleShareComment = (commentId: string) => {
    const url = `${window.location.origin}/?comment=${commentId}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="flex-1 h-full bg-[#141414] flex justify-center items-center relative overflow-hidden select-none">
      {/* Outer Alignment Box */}
      <div className="relative flex items-center justify-center w-full max-w-lg h-full p-0 sm:p-4">
        
        {/* MAIN VERTICAL SNAP SCROLL CONTAINER FOR REELS / CLIPS */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          className="w-full max-w-sm h-full max-h-none sm:max-h-[780px] bg-black relative sm:rounded-2xl overflow-y-auto snap-y snap-mandatory scroll-smooth shadow-2xl border border-[#2e2e2e] [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* TIKTOK-STYLE PULL-TO-REFRESH TOP LOADING OVERLAY */}
          {(pullDistance > 0 || isPullRefreshing) && (
            <div
              style={{
                height: `${Math.max(54, Math.min(88, pullDistance))}px`,
                opacity: Math.min(1, pullDistance / 35)
              }}
              className="absolute top-0 inset-x-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-black/95 via-black/80 to-transparent pointer-events-none transition-opacity"
            >
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1f1f23]/95 border border-white/15 shadow-xl backdrop-blur-md">
                {/* TikTok Dual-Dot & Spinner Indicator */}
                <div className="relative flex items-center justify-center w-5 h-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] animate-ping absolute opacity-75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff0050] animate-pulse relative" />
                  <RefreshCw
                    style={{
                      transform: !isPullRefreshing ? `rotate(${pullDistance * 4}deg)` : undefined
                    }}
                    className={`w-4 h-4 text-white absolute ${isPullRefreshing ? 'animate-spin' : ''}`}
                  />
                </div>
                <span className="text-xs font-semibold text-white tracking-tight">
                  {isPullRefreshing
                    ? 'Обновление контента...'
                    : pullDistance >= PULL_THRESHOLD
                    ? 'Отпустите для обновления'
                    : 'Потяните для обновления'}
                </span>
              </div>
            </div>
          )}

          {reels.length === 0 && (
            <div className="w-full h-full flex flex-col justify-between p-4 text-white bg-gradient-to-b from-[#1a1a1e] via-[#141416] to-black">
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={onBackToChats}
                  className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/15"
                >
                  <span>← Назад</span>
                </button>
                <span className="text-xs font-bold text-white/90">Рекомендации</span>
                {onOpenStudio && (
                  <button
                    onClick={onOpenStudio}
                    className="h-9 px-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-[#0077FF]/30"
                  >
                    <span>+ Клип</span>
                  </button>
                )}
              </div>

              <div className="my-auto text-center space-y-4 px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0077FF]/15 border border-[#0077FF]/30 flex items-center justify-center mx-auto text-[#71aaeb]">
                  <Volume2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Пока нет клипов</h3>
                  <p className="text-xs text-[#939393] leading-relaxed">
                    Снимите видео с камеры или загрузите свой ролик.
                  </p>
                </div>
                {onOpenStudio && (
                  <button
                    onClick={onOpenStudio}
                    className="px-5 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-[#0077FF]/25 inline-flex items-center gap-2"
                  >
                    <span>+ Выложить клип</span>
                  </button>
                )}
              </div>

              <div className="pb-2" />
            </div>
          )}

          {reels.map((reel, index) => {
            const isLiked = reel.isLiked !== undefined ? reel.isLiked : likedMap[reel.id];
            const likesCount = reel.likesCount ?? likesCountMap[reel.id] ?? 0;
            const isFirstReelPulled = index === 0 && (pullDistance > 0 || isPullRefreshing);

            return (
              <div
                key={reel.id}
                ref={(el) => { reelRefs.current[index] = el; }}
                style={{
                  transform: isFirstReelPulled ? `translateY(${Math.round(pullDistance * 0.55)}px)` : undefined,
                  transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                className="w-full h-full snap-start snap-always shrink-0 relative flex flex-col justify-between overflow-hidden bg-black cursor-grab active:cursor-grabbing"
              >
                {/* Media Background */}
                <div 
                  onDoubleClick={() => handleDoubleTap(reel.id)}
                  onClick={() => {
                    const vid = videoRefs.current[reel.id];
                    if (vid) {
                      if (vid.paused) {
                        vid.play().catch(() => {});
                      } else {
                        vid.pause();
                      }
                    }
                  }}
                  className="absolute inset-0 z-0 cursor-pointer group bg-[#121822]"
                >
                  {reel.mediaUrl && isVideoMedia(reel.mediaUrl, reel.mediaType) && !videoFailedMap[reel.id] ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[reel.id] = el;
                      }}
                      src={reel.mediaUrl}
                      autoPlay={index === activeReelIndex}
                      loop
                      muted={isMuted}
                      playsInline
                      preload="auto"
                      draggable={false}
                      onError={() =>
                        setVideoFailedMap((prev) => ({ ...prev, [reel.id]: true }))
                      }
                      className={`w-full h-full select-none ${
                        reel.aspectRatio === '1:1' || reel.aspectRatio === '3:4' || reel.aspectRatio === '16:9'
                          ? 'object-contain'
                          : 'object-cover'
                      }`}
                    />
                  ) : reel.mediaUrl && !imageFailedMap[reel.id] ? (
                    <img
                      src={reel.mediaUrl}
                      alt={reel.caption || 'Клип'}
                      draggable={false}
                      onError={() =>
                        setImageFailedMap((prev) => ({ ...prev, [reel.id]: true }))
                      }
                      className={`w-full h-full select-none ${
                        reel.aspectRatio === '1:1' || reel.aspectRatio === '3:4' || reel.aspectRatio === '16:9'
                          ? 'object-contain'
                          : 'object-cover'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#1b2838] via-[#141d29] to-[#0d131a]">
                      <img
                        src={reel.userAvatar}
                        alt={reel.userName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#0077FF] mb-4 shadow-xl"
                      />
                      <p className="text-sm font-semibold text-white max-w-xs leading-relaxed">
                        {reel.caption || 'Клип Chatix'}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/60 pointer-events-none" />

                  {/* Heart Pop Animation on Double Click */}
                  {heartAnimId === reel.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <Heart className="w-24 h-24 fill-rose-500 text-rose-500 scale-125 drop-shadow-2xl opacity-90" />
                    </div>
                  )}
                </div>

                {/* Top Overlay: Symmetrical & Uniform Header Buttons */}
                <div className="relative z-20 pt-3.5 px-3.5 flex flex-col gap-2 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={onBackToChats}
                      className="h-9 px-3.5 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/15 shadow-md active:scale-95"
                    >
                      <span>← Назад</span>
                    </button>

                    {/* Center TikTok-style Feed Indicator (also clickable to pull-refresh) */}
                    <button
                      onClick={triggerTikTokRefresh}
                      className="h-9 px-3.5 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/10 text-xs font-bold text-white/95 tracking-wide flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                      title="Потяните первое видео или нажмите для обновления"
                    >
                      <span>Рекомендации</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0077FF]" />
                    </button>

                    <div className="flex items-center gap-2">
                      {onOpenStudio && (
                        <button
                          onClick={onOpenStudio}
                          className="h-9 px-3.5 rounded-full bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-[#0077FF]/30 active:scale-95"
                        >
                          <span>+ Клип</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer border border-white/15 shadow-md transition active:scale-95"
                        title={isMuted ? 'Включить звук' : 'Выключить звук'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {showFreshBadge && !isPullRefreshing && (
                    <div className="self-center px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-md text-[11px] font-semibold text-emerald-300 shadow-lg">
                      Контент обновлён • свежие рекомендации
                    </div>
                  )}
                </div>

                {/* Right Side Action Panel — Ideal Uniform Circular Buttons like TikTok */}
                <div className="relative z-20 pr-3 py-2 self-end flex flex-col items-center gap-3.5 text-white">
                  {/* Author Avatar with Centered Follow Badge */}
                  <div 
                    onClick={() => onOpenUserProfile?.({
                      id: reel.userId || 'u_' + reel.userName,
                      name: reel.userName,
                      username: reel.userName.toLowerCase().replace(/\s+/g, '_'),
                      avatar: reel.userAvatar
                    })}
                    className="relative mb-1.5 cursor-pointer group"
                    title="Открыть профиль"
                  >
                    <img
                      src={reel.userAvatar}
                      alt={reel.userName}
                      draggable={false}
                      className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-lg group-hover:scale-105 transition"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playReactionSound();
                        onToggleFollow?.(reel.userId || 'u_' + reel.userName);
                      }}
                      className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white border border-black/40 shadow-md transition cursor-pointer ${
                        followingUserIds[reel.userId || 'u_' + reel.userName]
                          ? 'bg-emerald-500'
                          : 'bg-[#0077FF] hover:bg-[#0066DD]'
                      }`}
                    >
                      {followingUserIds[reel.userId || 'u_' + reel.userName] ? (
                        <span className="text-[10px] font-bold leading-none">✓</span>
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Like Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleToggleLike(reel.id)}
                      className={`w-11 h-11 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer border flex items-center justify-center shadow-lg ${
                        isLiked 
                          ? 'bg-rose-500/25 border-rose-500/60 text-rose-500' 
                          : 'bg-black/55 border-white/15 text-white hover:bg-black/80'
                      }`}
                      title="Нравится"
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                    </button>
                    <span className="text-[11px] font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                      {likesCount}
                    </span>
                  </div>

                  {/* Comment Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setActiveCommentsReelId(activeCommentsReelId === reel.id ? null : reel.id)}
                      className={`w-11 h-11 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer border flex items-center justify-center shadow-lg ${
                        activeCommentsReelId === reel.id
                          ? 'bg-[#0077FF]/35 border-[#0077FF] text-[#71aaeb]'
                          : 'bg-black/55 border-white/15 text-white hover:bg-black/80'
                      }`}
                      title="Комментарии"
                    >
                      <MessageCircle className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-[11px] font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                      {reel.comments.length}
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => toggleBookmark(reel.id)}
                      className={`w-11 h-11 rounded-full backdrop-blur-md border transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-lg ${
                        savedPostIds[reel.id] 
                          ? 'bg-[#0077FF]/30 border-[#0077FF] text-[#71aaeb]' 
                          : 'bg-black/55 border-white/15 text-white hover:bg-black/80'
                      }`}
                      title={savedPostIds[reel.id] ? 'В закладках' : 'В закладки'}
                    >
                      <Bookmark className={`w-5 h-5 ${savedPostIds[reel.id] ? 'fill-current' : ''}`} />
                    </button>
                    <span className="text-[10px] font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                      {savedPostIds[reel.id] ? 'Сохранено' : 'В закладки'}
                    </span>
                  </div>

                  {/* Share Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button 
                      onClick={() => setShareModalReel(reel)}
                      className="w-11 h-11 rounded-full bg-black/55 border border-white/15 backdrop-blur-md hover:bg-black/80 transition-all active:scale-90 cursor-pointer text-white flex items-center justify-center shadow-lg"
                      title="Поделиться клипом"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                      Поделиться
                    </span>
                  </div>

                  {/* Download Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleDownloadReel(reel)}
                      className={`w-11 h-11 rounded-full backdrop-blur-md border transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-lg ${
                        downloadingReelId === reel.id
                          ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                          : 'bg-black/55 border-white/15 text-white hover:bg-[#0077FF]'
                      }`}
                      title="Скачать клип"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-semibold text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                      {downloadingReelId === reel.id ? 'Загрузка...' : 'Скачать'}
                    </span>
                  </div>
                </div>

                {/* Bottom Caption & User Details */}
                <div className="relative z-20 p-4 text-white bg-gradient-to-t from-black/95 via-black/65 to-transparent pt-8">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      onClick={() => onOpenUserProfile?.({
                        id: reel.userId || 'u_' + reel.userName,
                        name: reel.userName,
                        username: reel.userName.toLowerCase().replace(/\s+/g, '_'),
                        avatar: reel.userAvatar
                      })}
                      className="font-bold text-sm text-white drop-shadow hover:underline hover:text-[#71aaeb] transition cursor-pointer"
                    >
                      @{reel.userName}
                    </button>

                    <span className="text-[11px] text-white/75 font-medium">
                      • {formatSmartTime(reel.createdAt, reel.id, nowTick)}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playReactionSound();
                        onToggleFollow?.(reel.userId || 'u_' + reel.userName);
                      }}
                      className={`h-7 px-3.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95 ${
                        followingUserIds[reel.userId || 'u_' + reel.userName]
                          ? 'bg-white/20 text-white border border-white/20'
                          : 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                      }`}
                    >
                      {followingUserIds[reel.userId || 'u_' + reel.userName] ? 'Вы подписаны' : 'Подписаться'}
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-[#e1e3e6] line-clamp-2 drop-shadow-sm">
                    {reel.caption}
                  </p>
                </div>

                {/* VK Clips Comments Drawer */}
                {activeCommentsReelId === reel.id && (
                  <div className="absolute inset-x-0 bottom-0 top-1/4 sm:top-1/3 bg-[#222222] z-30 rounded-t-2xl p-4 flex flex-col text-white shadow-2xl border-t border-[#2e2e2e]">
                    <div 
                      onClick={() => setActiveCommentsReelId(null)}
                      className="w-10 h-1 bg-[#828282]/60 rounded-full mx-auto mb-2.5 cursor-pointer shrink-0" 
                    />

                    {/* Drawer Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#2e2e2e] shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">Комментарии ({reel.comments.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveCommentsReelId(null);
                            setShareModalReel(reel);
                          }}
                          className="text-[11px] text-[#71aaeb] hover:text-white cursor-pointer px-2.5 py-1 bg-[#2c2d2e] rounded-lg flex items-center gap-1 transition"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Поделиться</span>
                        </button>
                        <button
                          onClick={() => setActiveCommentsReelId(null)}
                          className="text-[#828282] hover:text-white text-xs cursor-pointer px-2.5 py-1 bg-[#2c2d2e] rounded-lg transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Comments Scrollable List */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-thin">
                      {reel.comments.length === 0 ? (
                        <div className="text-center py-10 text-[#828282] text-xs">
                          Пока нет комментариев. Напишите первым!
                        </div>
                      ) : (
                        reel.comments.map((c) => (
                          <div key={c.id} className="text-xs bg-[#19191a] p-3 rounded-xl border border-[#2e2e2e] space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={c.userAvatar}
                                  alt={c.userName}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <span className="font-semibold text-[#71aaeb] text-xs">{c.userName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#828282]">{formatSmartTime(c.createdAt, c.id, nowTick)}</span>
                                <button 
                                  onClick={() => handleShareComment(c.id)}
                                  className="p-1 rounded hover:bg-[#2c2d2e] text-[#828282] hover:text-white transition cursor-pointer"
                                  title="Поделиться комментарием"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => onDeleteComment?.(reel.id, c.id)}
                                  className="p-1 rounded hover:bg-rose-500/20 text-[#828282] hover:text-rose-400 transition cursor-pointer"
                                  title="Удалить комментарий"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="text-[#e1e3e6] pl-8 text-xs leading-relaxed">{c.content}</div>

                            <div className="flex items-center gap-4 pl-8 pt-1 text-[10px] text-[#828282] font-medium">
                              <button 
                                onClick={() => {
                                  playReactionSound();
                                  c.likesCount = (c.likesCount || 0) + 1;
                                  setActiveCommentsReelId((prev) => prev);
                                }}
                                className="hover:text-rose-400 flex items-center gap-1 cursor-pointer transition"
                              >
                                <Heart className="w-3 h-3 text-rose-400" />
                                <span>{c.likesCount || 0}</span>
                              </button>
                              <button 
                                onClick={() => setNewCommentText(`@${c.userName} `)}
                                className="hover:text-[#71aaeb] cursor-pointer transition"
                              >
                                Ответить
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Sticky Bottom Input Field */}
                    <div className="pt-2 flex gap-2 shrink-0 border-t border-[#2e2e2e]">
                      <input
                        type="text"
                        placeholder="Написать комментарий..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(reel.id)}
                        className="flex-1 bg-[#2c2d2e] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#0077FF] border border-transparent placeholder-[#828282]"
                      />
                      <button
                        onClick={() => handleAddComment(reel.id)}
                        className="p-2.5 bg-[#0077FF] hover:bg-[#0066DD] rounded-lg text-white cursor-pointer transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DESKTOP SIDE NAVIGATION CONTROLS */}
        <div className="hidden sm:flex flex-col items-center gap-3 ml-4 select-none">
          <button
            onClick={handlePrevReel}
            disabled={activeReelIndex === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition border cursor-pointer ${
              activeReelIndex === 0
                ? 'bg-[#222222]/40 border-[#2e2e2e] text-[#828282] cursor-not-allowed opacity-40'
                : 'bg-[#222222] hover:bg-[#2c2d2e] border-[#2e2e2e] text-white'
            }`}
            title="Предыдущий клип (↑)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-1.5 py-1">
            {reels.map((_, idx) => (
              <span
                key={idx}
                onClick={() => scrollToReel(idx)}
                className={`w-2 rounded-full transition-all cursor-pointer ${
                  activeReelIndex === idx
                    ? 'h-5 bg-[#0077FF]'
                    : 'h-2 bg-[#3a3a3a] hover:bg-[#828282]'
                }`}
                title={`Клип ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNextReel}
            disabled={activeReelIndex >= totalReels - 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition border cursor-pointer ${
              activeReelIndex >= totalReels - 1
                ? 'bg-[#222222]/40 border-[#2e2e2e] text-[#828282] cursor-not-allowed opacity-40'
                : 'bg-[#222222] hover:bg-[#2c2d2e] border-[#2e2e2e] text-white'
            }`}
            title="Следующий клип (↓)"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* Share Reel Modal */}
      <ShareReelModal
        isOpen={!!shareModalReel}
        onClose={() => setShareModalReel(null)}
        reel={shareModalReel}
        chats={chats}
        onSendToChat={(chatId, reel, customMsg) => {
          onSendToChat?.(chatId, reel, customMsg);
        }}
      />
    </div>
  );
};
