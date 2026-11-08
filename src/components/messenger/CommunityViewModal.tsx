import React, { useState, useEffect, useRef } from 'react';
import { Community, CommunityModerator, CommunityTabConfig, CommunityFolder, CommunityEvent, Post, PostComment, User, Chat, CommunityVideo, CommunityVideoComment } from '../../types';
import { 
  X, 
  Users, 
  Globe, 
  Lock, 
  Share2, 
  UserPlus, 
  UserCheck, 
  ShieldCheck, 
  PlusCircle, 
  Edit3, 
  Radio, 
  MessageSquare, 
  MessageCircle,
  Send,
  Trash2,
  Image as ImageIcon, 
  FileText, 
  Check, 
  Sparkles, 
  Copy, 
  ExternalLink,
  Phone,
  Video,
  Plus,
  Upload,
  Camera,
  BarChart2,
  Paperclip,
  Music,
  Film,
  FolderPlus,
  Folder,
  Calendar,
  Sliders,
  Grid,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Download,
  Maximize2,
  User as UserIcon,
  Heart,
  Info,
  ChevronLeft,
  Settings,
  QrCode,
  Link2,
  Play,
  Pause,
  Search,
  Volume2,
  VolumeX,
  MessageCircle as CommentIcon,
  Share,
  ThumbsUp,
  ListVideo,
  Clock,
  Filter,
  PlusSquare
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { formatSmartTime } from '../../utils/dateUtils';
import { ViewTargetUser } from './OtherUserProfileModal';
import { AuraVideoPlayer } from '../video/AuraVideoPlayer';
import { 
  fetchCommunityVideos, 
  saveCommunityVideo, 
  deleteAllCommunityVideos,
  updateCommunityVideo,
  deleteCommunityVideo,
  likeCommunityVideo, 
  commentCommunityVideo, 
  incrementCommunityVideoView,
  fetchVideoWatchPosition,
  saveVideoWatchPosition
} from '../../firebase';

interface CommunityViewModalProps {
  community: Community | null;
  currentUser: User;
  chats?: Chat[];
  posts?: Post[];
  onClose: () => void;
  onUpdateCommunity: (updated: Community) => void;
  onPublishCommunityPost: (communityId: string, postData: Partial<Post> & { caption?: string }) => void;
  onSelectChat?: (chat: Chat) => void;
  onOpenUserProfile?: (user: ViewTargetUser) => void;
  onMessageUser?: (user: ViewTargetUser) => void;
  onOpenCommunityChat?: (community: Community) => void;
  onToggleLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, comment: PostComment) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onDeletePost?: (postId: string) => void;
  initialCommunityTab?: string;
}

const presetBanners = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000&auto=format&fit=crop&q=80'
];

const presetBackgrounds = [
  { label: 'Стандартный тёмный', value: '' },
  { label: 'Глубокий космос', value: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Неоновая волна', value: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Киберпанк сетка', value: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80' }
];

const sampleContactsForMods = [
  {
    userId: 'usr_durov',
    displayName: 'Павел Дуров',
    username: 'durov',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DurovAnime&backgroundColor=182533'
  },
  {
    userId: 'usr_elena',
    displayName: 'Елена (Дизайн)',
    username: 'elena_ux',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=ElenaArt&backgroundColor=4c1d95'
  },
  {
    userId: 'usr_mark',
    displayName: 'Марк (Архитектор)',
    username: 'mark_arch',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MarkTech&backgroundColor=064e3b'
  }
];

export const CommunityViewModal: React.FC<CommunityViewModalProps> = ({
  community,
  currentUser,
  chats = [],
  posts = [],
  onClose,
  onUpdateCommunity,
  onPublishCommunityPost,
  onSelectChat,
  onOpenUserProfile,
  onMessageUser,
  onOpenCommunityChat,
  onToggleLikePost,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  initialCommunityTab
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModsModal, setShowModsModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'add_person' | 'link' | 'qr'>('add_person');
  const [customInviteUsername, setCustomInviteUsername] = useState('');
  const [addedUserIdsLocal, setAddedUserIdsLocal] = useState<Record<string, boolean>>({});

  // Edit form states (доступно только создателю и модераторам)
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editBackgroundUrl, setEditBackgroundUrl] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editHideAdmins, setEditHideAdmins] = useState(false);
  const [editAttachedChannelId, setEditAttachedChannelId] = useState<string>('');
  const [editAttachedGroupId, setEditAttachedGroupId] = useState<string>('');

  // Fullscreen photo/video viewer state
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    title?: string;
  } | null>(null);

  // New post form states with rich attachments (up to 10 photos, up to 10 videos)
  const [postCaption, setPostCaption] = useState('');
  const [postPhotos, setPostPhotos] = useState<string[]>([]);
  const [postVideos, setPostVideos] = useState<string[]>([]);
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postAttachmentType, setPostAttachmentType] = useState<'none' | 'image' | 'video' | 'file' | 'music' | 'poll'>('none');
  const [postAttachedFile, setPostAttachedFile] = useState<{ name: string; url: string; size?: string } | null>(null);
  const [postMusic, setPostMusic] = useState<{ id: string; title: string; artist: string; duration: string; genre?: string } | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [pollOption3, setPollOption3] = useState('');

  // Add Moderator & Post Author Mode form states
  const [modCustomTitle, setModCustomTitle] = useState('Модератор');
  const [postAuthorMode, setPostAuthorMode] = useState<'community' | 'user'>('community');

  // Community Tabs state: 'posts' | 'clips' | 'videos' | 'events' | 'home' | 'requests'
  const [activeTab, setActiveTab] = useState<string>(initialCommunityTab || 'posts');

  React.useEffect(() => {
    if (initialCommunityTab) {
      setActiveTab(initialCommunityTab);
    }
  }, [initialCommunityTab, community?.id]);

  // Tab Editor modal
  const [showTabEditorModal, setShowTabEditorModal] = useState(false);
  const [editableTabs, setEditableTabs] = useState<CommunityTabConfig[]>([]);

  // Folder modal (Clip / Video folder creation)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderTargetType, setFolderTargetType] = useState<'clips' | 'videos'>('clips');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Events modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  // Unified "Подробнее" section toggle state
  const [showDetails, setShowDetails] = useState(false);
  // Local VK wall post likes fallback state
  const [likedPostsMap, setLikedPostsMap] = useState<Record<string, boolean>>({});
  // Community wall post comments input state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentMedia, setCommentMedia] = useState<Record<string, { url: string; type: 'image' | 'gif' } | null>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // --- Community Video & Reels Platform State ---
  const [videoSubTab, setVideoSubTab] = useState<'youtube' | 'reels'>('youtube');
  const [communityVideos, setCommunityVideos] = useState<CommunityVideo[]>([]);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('all');
  const [videoSortBy, setVideoSortBy] = useState<'newest' | 'views' | 'likes'>('newest');

  // Interactive YouTube Video Player Modal State
  const [activePlayingVideo, setActivePlayingVideo] = useState<CommunityVideo | null>(null);
  const [videoCommentInput, setVideoCommentInput] = useState('');

  // Video / Reel Upload Modal State (Multi-step Wizard)
  const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3 | 4>(1);
  const [uploadVideoType, setUploadVideoType] = useState<'video' | 'reel'>('video');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadMediaUrl, setUploadMediaUrl] = useState('');
  const [uploadCoverUrl, setUploadCoverUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Развлечения');
  const [uploadPlaylist, setUploadPlaylist] = useState('Общие');
  const [uploadPrivacy, setUploadPrivacy] = useState<'public' | 'private' | 'unlisted'>('public');

  // AI Copyright Scan State
  const [aiScanProgress, setAiScanProgress] = useState(0);
  const [aiScanStatus, setAiScanStatus] = useState<'idle' | 'scanning' | 'passed' | 'failed'>('idle');
  const [aiScanLogs, setAiScanLogs] = useState<string[]>([]);

  const handleOpenUploadModal = (type: 'video' | 'reel' = 'video') => {
    setUploadVideoType(type);
    setUploadStep(1);
    setUploadTitle('');
    setUploadDesc('');
    setUploadMediaUrl('');
    setUploadCoverUrl('');
    setUploadCategory('Развлечения');
    setUploadPlaylist('Общие');
    setUploadPrivacy('public');
    setAiScanProgress(0);
    setAiScanStatus('idle');
    setAiScanLogs([]);
    setShowUploadVideoModal(true);
  };

  // Edit Video Modal State
  const [editingVideo, setEditingVideo] = useState<CommunityVideo | null>(null);
  const [videoEditTitle, setVideoEditTitle] = useState('');
  const [videoEditDescription, setVideoEditDescription] = useState('');
  const [videoEditPlaylist, setVideoEditPlaylist] = useState('');
  const [videoEditPrivacy, setVideoEditPrivacy] = useState<'public' | 'private' | 'unlisted'>('public');
  const [videoEditCoverUrl, setVideoEditCoverUrl] = useState('');
  const [isVideoLinkCopied, setIsVideoLinkCopied] = useState(false);

  const handleOpenEditVideo = (vid: CommunityVideo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingVideo(vid);
    setVideoEditTitle(vid.title || '');
    setVideoEditDescription(vid.description || '');
    setVideoEditPlaylist(vid.playlist || 'Общие');
    setVideoEditPrivacy(vid.privacy || 'public');
    setVideoEditCoverUrl(vid.coverUrl || '');
    setIsVideoLinkCopied(false);
  };

  const handleCaptureFrameFromVideo = (videoUrl: string, onCaptured: (dataUrl: string) => void) => {
    if (!videoUrl) return;
    const tempVid = document.createElement('video');
    tempVid.crossOrigin = 'anonymous';
    tempVid.src = videoUrl;
    tempVid.muted = true;
    tempVid.playsInline = true;
    tempVid.currentTime = 1.5;

    const capture = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempVid.videoWidth || 640;
        canvas.height = tempVid.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            onCaptured(dataUrl);
            playReactionSound();
          }
        }
      } catch {
        // Fallback if CORS blocks canvas drawImage
        onCaptured(presetBanners[0]);
      }
    };

    tempVid.onseeked = capture;
    tempVid.onloadeddata = () => {
      if (tempVid.readyState >= 2) {
        tempVid.currentTime = Math.min(1.5, (tempVid.duration || 3) / 2);
      }
    };
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>, onResult: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playReactionSound();
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onResult(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEditedVideo = async () => {
    if (!editingVideo) return;
    playSentSound();
    const updated: CommunityVideo = {
      ...editingVideo,
      title: videoEditTitle.trim() || 'Видеозапись',
      description: videoEditDescription.trim(),
      playlist: videoEditPlaylist.trim() || 'Общие',
      privacy: videoEditPrivacy,
      coverUrl: videoEditCoverUrl.trim() || undefined
    };
    setCommunityVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    if (activePlayingVideo && activePlayingVideo.id === updated.id) {
      setActivePlayingVideo(updated);
    }
    setEditingVideo(null);
    await updateCommunityVideo(updated);
  };

  const handleDeleteSingleVideo = async (videoId: string) => {
    playReactionSound();
    setCommunityVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (activePlayingVideo && activePlayingVideo.id === videoId) {
      setActivePlayingVideo(null);
    }
    setEditingVideo(null);
    await deleteCommunityVideo(videoId);
  };

  // Reels Vertical Feed State
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isReelMuted, setIsReelMuted] = useState(false);
  const [showReelCommentsModal, setShowReelCommentsModal] = useState(false);
  const [reelCommentInput, setReelCommentInput] = useState('');

  // Load community videos from PostgreSQL backend (только реальные пользовательские видео)
  useEffect(() => {
    if (!community?.id) return;
    fetchCommunityVideos(community.id).then((serverVids) => {
      if (Array.isArray(serverVids)) {
        setCommunityVideos(serverVids);
      } else {
        setCommunityVideos([]);
      }
    });
  }, [community?.id]);

  const handleLikeVideo = (vid: CommunityVideo) => {
    playReactionSound();
    const nextLiked = !vid.isLiked;
    const diff = nextLiked ? 1 : -1;
    const updatedLikes = Math.max(0, vid.likesCount + diff);

    setCommunityVideos((prev) =>
      prev.map((v) => (v.id === vid.id ? { ...v, isLiked: nextLiked, likesCount: updatedLikes } : v))
    );

    if (activePlayingVideo && activePlayingVideo.id === vid.id) {
      setActivePlayingVideo((prev) => (prev ? { ...prev, isLiked: nextLiked, likesCount: updatedLikes } : null));
    }

    likeCommunityVideo(vid.id, nextLiked);
  };

  const handleAddVideoCommentSubmit = (vidId: string, contentText: string) => {
    if (!contentText.trim()) return;
    playSentSound();

    const newComment: CommunityVideoComment = {
      id: 'vc_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      content: contentText.trim(),
      createdAt: 'Только что'
    };

    setCommunityVideos((prev) =>
      prev.map((v) => (v.id === vidId ? { ...v, comments: [...(v.comments || []), newComment] } : v))
    );

    if (activePlayingVideo && activePlayingVideo.id === vidId) {
      setActivePlayingVideo((prev) => (prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : null));
    }

    commentCommunityVideo(vidId, newComment);
    setVideoCommentInput('');
    setReelCommentInput('');
  };

  const [savedWatchPositionSec, setSavedWatchPositionSec] = useState<number>(0);

  const handleOpenVideoPlayer = (vid: CommunityVideo) => {
    const updatedViews = (vid.viewsCount || 0) + 1;
    const updatedVid = { ...vid, viewsCount: updatedViews };

    setCommunityVideos((prev) => prev.map((v) => (v.id === vid.id ? updatedVid : v)));
    setActivePlayingVideo(updatedVid);

    fetchVideoWatchPosition(vid.id, currentUser.id).then((posSec) => {
      setSavedWatchPositionSec(posSec || 0);
    });

    incrementCommunityVideoView(vid.id);
  };

  const handleStartAiScan = () => {
    setAiScanStatus('scanning');
    setAiScanProgress(0);
    setAiScanLogs(['🔍 Запуск алгоритма сканирования ИИ...']);

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setAiScanProgress(p);
      if (p === 25) {
        setAiScanLogs((prev) => [...prev, '🎵 Проверка аудиодорожки на совпадения по авторским правам...']);
      } else if (p === 75) {
        setAiScanLogs((prev) => [...prev, '🛡️ Сканирование видеоряда и отсутствие нарушений лицензии...']);
      } else if (p >= 100) {
        clearInterval(interval);
        setAiScanProgress(100);
        setAiScanStatus('passed');
        setAiScanLogs((prev) => [...prev, '✅ Авторские права подлинны. Нарушений не обнаружено!']);
      }
    }, 400);
  };

  const handleUploadVideoFormSubmit = () => {
    if (!community || !uploadMediaUrl.trim()) return;
    playSentSound();

    const newVid: CommunityVideo = {
      id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      communityId: community.id,
      userId: currentUser.id,
      userName: postAuthorMode === 'community' ? community.title : currentUser.displayName,
      userAvatar: postAuthorMode === 'community' ? community.avatarUrl : currentUser.avatarUrl,
      type: uploadVideoType,
      title: uploadTitle.trim() || (uploadVideoType === 'reel' ? 'Короткий клип' : 'Видеозапись'),
      description: uploadDesc.trim(),
      mediaUrl: uploadMediaUrl.trim(),
      coverUrl: uploadCoverUrl.trim() || undefined,
      category: uploadCategory,
      playlist: uploadPlaylist.trim() || 'Общие',
      privacy: uploadPrivacy,
      copyrightStatus: 'clean',
      viewsCount: 1,
      likesCount: 0,
      comments: [],
      createdAt: new Date().toISOString()
    };

    saveCommunityVideo(newVid);
    setCommunityVideos((prev) => [newVid, ...prev]);
    setUploadStep(4); // Переход на Шаг 4: Опубликовано!
  };

  const handleDeleteAllVideos = async () => {
    if (!community) return;
    playReactionSound();
    setCommunityVideos([]);
    setActivePlayingVideo(null);
    await deleteAllCommunityVideos(community.id);
  };

  const handleFileUploadForVideo = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean = false) => {
    if (isCover) {
      handleCoverFileSelect(e, (dataUrl) => setUploadCoverUrl(dataUrl));
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      playReactionSound();
      const url = URL.createObjectURL(file);
      setUploadMediaUrl(url);
    }
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddCommunityComment = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    const attached = commentMedia[postId];
    if (!text && !attached) return;

    playSentSound();
    const newComment: PostComment = {
      id: 'comm_c_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatarUrl,
      content: text || 'Фотография',
      mediaUrl: attached?.url,
      mediaType: attached?.type,
      createdAt: new Date().toISOString(),
      likesCount: 0
    };

    onAddComment?.(postId, newComment);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setCommentMedia((prev) => ({ ...prev, [postId]: null }));
  };

  const handleCommentPhotoUpload = (postId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playReactionSound();
      const url = URL.createObjectURL(file);
      setCommentMedia((prev) => ({
        ...prev,
        [postId]: { url, type: 'image' }
      }));
    }
  };

  if (!community) return null;

  const normalizedCurrentUsername = (currentUser.username || '').replace(/^@/, '').trim().toLowerCase();
  const normalizedOwnerUsername = (community.ownerUsername || '').replace(/^@/, '').trim().toLowerCase();
  const isOwner =
    community.ownerId === currentUser.id ||
    (Boolean(normalizedCurrentUsername) &&
      Boolean(normalizedOwnerUsername) &&
      normalizedCurrentUsername === normalizedOwnerUsername);
  const isSubscribed = community.subscribersUserIds.includes(currentUser.id);
  const isModerator = community.moderators.some(
    (m) =>
      m.userId === currentUser.id ||
      (Boolean(normalizedCurrentUsername) &&
        Boolean(m.username) &&
        m.username.replace(/^@/, '').trim().toLowerCase() === normalizedCurrentUsername)
  );
  const canManage = isOwner || isModerator;
  const pendingRequests = community.joinRequests || [];
  const hasPendingRequest = pendingRequests.some(
    (r) =>
      r.userId === currentUser.id ||
      (Boolean(normalizedCurrentUsername) &&
        Boolean(r.username) &&
        r.username.replace(/^@/, '').trim().toLowerCase() === normalizedCurrentUsername)
  );
  const isPrivateLocked = community.isPrivate && !isSubscribed && !canManage;

  const activeTabsList = (community.tabsConfig || [
    { id: 'posts', name: 'Посты', enabled: true },
    { id: 'clips', name: 'Клип', enabled: true },
    { id: 'videos', name: 'Видео', enabled: true },
    { id: 'events', name: 'События', enabled: true }
  ]).filter((t) => t.enabled);

  const handleOpenTabEditor = () => {
    setEditableTabs(
      community.tabsConfig || [
        { id: 'posts', name: 'Посты', enabled: true },
        { id: 'clips', name: 'Клип', enabled: true },
        { id: 'videos', name: 'Видео', enabled: true },
        { id: 'events', name: 'События', enabled: true },
        { id: 'home', name: 'Главная', enabled: false }
      ]
    );
    setShowTabEditorModal(true);
  };

  const handleSaveTabsConfig = () => {
    playSentSound();
    onUpdateCommunity({
      ...community,
      tabsConfig: editableTabs
    });
    setShowTabEditorModal(false);
  };

  const handleToggleTabEnabled = (tabId: string) => {
    setEditableTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleMoveTab = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= editableTabs.length) return;
    const updated = [...editableTabs];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setEditableTabs(updated);
  };

  const handleCreateFolderSubmit = () => {
    if (!newFolderName.trim()) return;
    playSentSound();
    const newFolder: CommunityFolder = {
      id: 'fld_' + Date.now(),
      name: newFolderName.trim(),
      type: folderTargetType,
      createdAt: 'Только что'
    };
    const updatedFolders = [...(community.folders || []), newFolder];
    onUpdateCommunity({
      ...community,
      folders: updatedFolders
    });
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const handleCreateEventSubmit = () => {
    if (!eventTitle.trim()) return;
    playSentSound();
    const newEvent: CommunityEvent = {
      id: 'evt_' + Date.now(),
      title: eventTitle.trim(),
      date: eventDate.trim() || 'Завтра в 18:00',
      description: eventDesc.trim() || undefined,
      attendeesCount: 1,
      isAttending: true
    };
    const updatedEvents = [...(community.events || []), newEvent];
    onUpdateCommunity({
      ...community,
      events: updatedEvents
    });
    setEventTitle('');
    setEventDate('');
    setEventDesc('');
    setShowEventModal(false);
  };

  const handleToggleEventAttendance = (eventId: string) => {
    playReactionSound();
    const updatedEvents = (community.events || []).map((e) => {
      if (e.id === eventId) {
        const isAttending = !e.isAttending;
        return {
          ...e,
          isAttending,
          attendeesCount: isAttending ? e.attendeesCount + 1 : Math.max(1, e.attendeesCount - 1)
        };
      }
      return e;
    });
    onUpdateCommunity({
      ...community,
      events: updatedEvents
    });
  };

  const handleToggleSubscribe = () => {
    playSentSound();
    const now = Date.now();
    if (isSubscribed) {
      const updatedSubscribers = community.subscribersUserIds.filter((id) => id !== currentUser.id);
      onUpdateCommunity({
        ...community,
        subscribersUserIds: updatedSubscribers,
        subscribersCount: updatedSubscribers.length,
        updatedAt: now
      });
      return;
    }

    const updatedSubscribers = [...community.subscribersUserIds, currentUser.id];
    onUpdateCommunity({
      ...community,
      subscribersUserIds: updatedSubscribers,
      subscribersCount: updatedSubscribers.length,
      updatedAt: now
    });
  };

  const handleApproveJoinRequest = (targetUserId: string) => {
    playSentSound();
    const updatedRequests = pendingRequests.filter((r) => r.userId !== targetUserId);
    const updatedSubscribers = community.subscribersUserIds.includes(targetUserId)
      ? community.subscribersUserIds
      : [...community.subscribersUserIds, targetUserId];

    onUpdateCommunity({
      ...community,
      joinRequests: updatedRequests,
      subscribersUserIds: updatedSubscribers,
      subscribersCount: updatedSubscribers.length,
      updatedAt: Date.now()
    });
  };

  const handleDeclineJoinRequest = (targetUserId: string) => {
    playReactionSound();
    onUpdateCommunity({
      ...community,
      joinRequests: pendingRequests.filter((r) => r.userId !== targetUserId),
      updatedAt: Date.now()
    });
  };

  const handleCopyLink = () => {
    const link = `https://aurachat.app/community/join?code=${community.inviteCode}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    playReactionSound();
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenEdit = () => {
    if (!canManage) return; // Редактировать сообщество, баннер и фон может только создатель и модер
    setEditTitle(community.title);
    setEditDesc(community.description);
    setEditAvatarUrl(community.avatarUrl);
    setEditBannerUrl(community.bannerUrl || presetBanners[0]);
    setEditBackgroundUrl(community.backgroundUrl || '');
    setEditIsPrivate(community.isPrivate);
    setEditHideAdmins(Boolean(community.hideAdmins));
    setEditAttachedChannelId(community.attachedChannelId || '');
    setEditAttachedGroupId(community.attachedGroupId || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!canManage || !editTitle.trim()) return;
    playSentSound();

    const selectedChannel = chats.find((c) => c.id === editAttachedChannelId);
    const selectedGroup = chats.find((c) => c.id === editAttachedGroupId);

    onUpdateCommunity({
      ...community,
      title: editTitle.trim(),
      description: editDesc.trim(),
      avatarUrl: editAvatarUrl || community.avatarUrl,
      bannerUrl: editBannerUrl || community.bannerUrl,
      backgroundUrl: editBackgroundUrl || undefined,
      isPrivate: editIsPrivate,
      hideAdmins: editHideAdmins,
      attachedChannelId: selectedChannel?.id,
      attachedChannelTitle: selectedChannel ? `${selectedChannel.title} (📢 Канал)` : undefined,
      attachedGroupId: selectedGroup?.id,
      attachedGroupTitle: selectedGroup ? `${selectedGroup.title} (👥 Группа)` : undefined
    });

    setShowEditModal(false);
  };

  const handleToggleHideAdmins = () => {
    if (!canManage) return;
    playReactionSound();
    onUpdateCommunity({
      ...community,
      hideAdmins: !community.hideAdmins
    });
  };

  const handleAddModerator = (contact: typeof sampleContactsForMods[0]) => {
    playSentSound();
    const existing = community.moderators.find((m) => m.userId === contact.userId);
    let updatedMods = [...community.moderators];

    if (existing) {
      updatedMods = updatedMods.filter((m) => m.userId !== contact.userId);
    } else {
      updatedMods.push({
        userId: contact.userId,
        displayName: contact.displayName,
        username: contact.username,
        avatarUrl: contact.avatarUrl,
        role: 'moderator',
        customTitle: modCustomTitle || 'Модератор',
        addedAt: 'Только что'
      });
    }

    onUpdateCommunity({
      ...community,
      moderators: updatedMods
    });
  };

  const handlePublishPostSubmit = () => {
    const hasMedia = postPhotos.length > 0 || postVideos.length > 0 || postMediaUrl.trim().length > 0;
    const hasOtherContent = postCaption.trim().length > 0 || pollQuestion.trim().length > 0 || !!postMusic || !!postAttachedFile;
    if (!hasMedia && !hasOtherContent) return;

    playSentSound();

    let finalPoll = undefined;
    if (postAttachmentType === 'poll' && pollQuestion.trim()) {
      const opts = [pollOption1.trim(), pollOption2.trim(), pollOption3.trim()].filter(Boolean);
      if (opts.length >= 2) {
        finalPoll = {
          question: pollQuestion.trim(),
          options: opts.map((text) => ({ text, votes: 0 })),
          totalVotes: 0
        };
      }
    }

    const allMediaUrls = [
      ...postPhotos,
      ...postVideos,
      ...(postMediaUrl.trim() ? [postMediaUrl.trim()] : [])
    ];
    const isVideo = postVideos.length > 0;
    const primaryMediaUrl = allMediaUrls[0] || undefined;

    onPublishCommunityPost(community.id, {
      caption: postCaption.trim(), // Текст необязателен!
      mediaUrl: primaryMediaUrl,
      images: allMediaUrls,
      mediaType: isVideo ? 'video' : (allMediaUrls.length > 0 ? 'image' : 'text'),
      attachedFile: postAttachedFile ? { name: postAttachedFile.name, size: postAttachedFile.size || '1.2 MB', url: postAttachedFile.url } : undefined,
      music: postMusic || undefined,
      poll: finalPoll,
      type: 'post',
      userName: postAuthorMode === 'community' ? community.title : currentUser.displayName,
      userAvatar: postAuthorMode === 'community' ? community.avatarUrl : currentUser.avatarUrl,
      userId: postAuthorMode === 'community' ? community.id : currentUser.id
    });

    setPostCaption('');
    setPostPhotos([]);
    setPostVideos([]);
    setPostMediaUrl('');
    setPostAttachedFile(null);
    setPostMusic(null);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setPollOption3('');
    setPostAttachmentType('none');
    setShowNewPostModal(false);
  };

  const channelChats = chats.filter((c) => c.type === 'channel');
  const groupChats = chats.filter((c) => c.type === 'group');

  const ownerInMods = community.moderators.find(
    (m) => m.userId === community.ownerId || m.role === 'owner'
  );
  const extraModerators = community.moderators.filter(
    (m) => m.userId !== community.ownerId && m.role !== 'owner'
  );
  const ownerDisplayName =
    community.ownerName || ownerInMods?.displayName || currentUser.displayName;
  const ownerUsername =
    community.ownerUsername ||
    ownerInMods?.username ||
    (community.ownerId === currentUser.id ? currentUser.username : 'creator');
  const ownerAvatar =
    community.ownerAvatar || ownerInMods?.avatarUrl || currentUser.avatarUrl;

  const communityPosts = posts.filter(
    (p) => p.communityId === community.id || p.communityTitle === community.title
  );

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (deltaX > 75 || deltaY > 110) {
      onClose();
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#141414] flex flex-col text-[#e1e3e6] w-full h-full select-none overflow-hidden"
    >
      <div className="bg-[#141414] w-full h-full flex flex-col relative overflow-hidden">
        
        {/* VK Top Navigation Bar — Оптимизировано под iPhone 13 и мобильные экраны */}
        <div className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between shrink-0 z-10 gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#e1e3e6] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-[#71aaeb]" />
              <span className="hidden xs:inline">Назад</span>
            </button>

            <div className="h-4 w-[1px] bg-[#2e2e2e] hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <img
                src={community.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0 hidden sm:block"
              />
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs">
                {community.title}
              </span>
              <span className="text-[11px] text-[#828282] hidden md:inline">
                · {community.isPrivate ? 'Закрытое сообщество' : 'Открытое сообщество'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setInviteModalTab('add_person');
                setShowInviteModal(true);
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Добавить человека"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Добавить человека</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInviteModalTab(community.isPrivate ? 'link' : 'qr');
                setShowInviteModal(true);
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#e1e3e6] flex items-center gap-1.5 cursor-pointer"
              title="Ссылка и QR-код сообщества"
            >
              <QrCode className="w-3.5 h-3.5 text-[#71aaeb]" />
              <span className="hidden md:inline">Ссылка / QR</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#e1e3e6] flex items-center gap-1.5 cursor-pointer"
                title="Управление сообществом"
              >
                <Settings className="w-3.5 h-3.5 text-[#71aaeb]" />
                <span className="hidden md:inline">Управление</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable VK Main Body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin w-full relative"
          style={
            community.backgroundUrl
              ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(20, 20, 20, 0.85), rgba(20, 20, 20, 0.95)), url(${community.backgroundUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : undefined
          }
        >
          <div className="max-w-5xl mx-auto p-3 sm:p-5 space-y-4">
            
            {/* ================================================================= */}
            {/* VK COMMUNITY HEADER CARD (Обложка + Аватар + Кнопки + О сообществе) */}
            {/* ================================================================= */}
            <div className="rounded-2xl overflow-hidden border border-[#2e2e2e] bg-[#222222] shadow-lg">
              
              {/* 1. VK Cover Banner */}
              <div className="relative group bg-[#19191a]">
                <img
                  src={community.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'}
                  alt="Обложка сообщества"
                  onClick={() =>
                    setFullscreenMedia({
                      url: community.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
                      type: 'image',
                      title: `Обложка: ${community.title}`
                    })
                  }
                  className="w-full h-40 sm:h-56 object-cover cursor-zoom-in"
                  title="Нажмите, чтобы открыть обложку полностью"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Open Cover Fullscreen Button */}
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenMedia({
                      url: community.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
                      type: 'image',
                      title: `Обложка: ${community.title}`
                    })
                  }
                  className="absolute top-3 left-3 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#71aaeb]" />
                  <span>Обложка</span>
                </button>

                {/* Change Cover & Background Button (Only Creator & Moderator) */}
                {canManage && (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/65 hover:bg-[#0077FF] text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 cursor-pointer"
                    title="Изменить обложку, фон и настройки сообщества"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span><span className="hidden xs:inline">Изменить </span>обложку</span>
                  </button>
                )}
              </div>

              {/* 2. VK Avatar + Community Name + Action Buttons */}
              <div className="px-4 sm:px-6 pb-4 pt-2 relative">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  
                  {/* Left: Circular VK Avatar + Title + Subtitle */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 min-w-0 flex-1">
                    <div
                      className="relative -mt-12 sm:-mt-14 shrink-0 group cursor-zoom-in"
                      onClick={() =>
                        setFullscreenMedia({
                          url: community.avatarUrl,
                          type: 'image',
                          title: community.title
                        })
                      }
                      title="Нажмите, чтобы открыть аватар сообщества полностью"
                    >
                      <img
                        src={community.avatarUrl}
                        alt={community.title}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-[#222222] bg-[#19191a] shadow-xl"
                      />
                      <span className="absolute bottom-1 right-1 p-1.5 rounded-full bg-black/75 text-white opacity-0 group-hover:opacity-100">
                        <Maximize2 className="w-3 h-3 text-[#71aaeb]" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pb-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight break-words">
                          {community.title}
                        </h1>
                        <span title="Подтверждённое сообщество" className="inline-flex shrink-0">
                          <ShieldCheck className="w-5 h-5 text-[#0077FF]" />
                        </span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[#939393] mt-1 break-words">
                        {community.isPrivate ? 'Закрытое сообщество' : 'Публичное сообщество'} · @club_{community.inviteCode.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Right: VK Action Buttons — Адаптировано под iPhone 13 (текст никогда не обрезается) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:shrink-0 mt-3 sm:mt-0">
                    {/* Primary Button: Подписаться / Вы подписаны */}
                    <button
                      onClick={handleToggleSubscribe}
                      className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm ${
                        isSubscribed
                          ? 'bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] border border-[#3d3d40]'
                          : 'bg-[#0077FF] hover:bg-[#0066DD] text-white shadow-blue-500/20'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>Вы подписаны</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 shrink-0" />
                          <span>Подписаться</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Buttons: Опубликовать и Сообщение (на iPhone 13 делятся 50/50 в ряд, на ПК в одну линию) */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setShowNewPostModal(true)}
                          className="px-3 py-2.5 sm:py-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition border border-[#38383c]"
                        >
                          <Plus className="w-4 h-4 text-[#71aaeb] shrink-0" />
                          <span>Опубликовать</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCommunityChat) {
                            onOpenCommunityChat(community);
                          } else {
                            onMessageUser?.({
                              id: community.ownerId,
                              name: `${community.title} (${ownerDisplayName})`,
                              username: ownerUsername,
                              avatar: community.avatarUrl
                            });
                          }
                        }}
                        className={`px-3 py-2.5 sm:py-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition border border-[#38383c] ${
                          !canManage ? 'col-span-2' : ''
                        }`}
                        title={`Перейти в чат сообщества (диалог с владельцем: ${ownerDisplayName})`}
                      >
                        <MessageSquare className="w-4 h-4 text-[#71aaeb] shrink-0" />
                        <span>Сообщение</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. VK Compact Info Strip (Подписчики + Краткое описание + Кнопка «О сообществе») */}
                <div className="mt-4 pt-3.5 border-t border-[#2e2e2e] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-[13px]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[#939393] min-w-0">
                    <div className="flex items-center gap-1.5 text-[#e1e3e6] font-medium">
                      <Users className="w-4 h-4 text-[#71aaeb] shrink-0" />
                      <span className="font-bold text-white">{community.subscribersCount}</span>
                      <span className="text-[#939393]">подписчиков</span>
                    </div>

                    {community.description && (
                      <div className="flex items-center gap-1.5 min-w-0 max-w-md">
                        <Info className="w-4 h-4 text-[#939393] shrink-0" />
                        <span className="truncate text-[#e1e3e6]">{community.description}</span>
                      </div>
                    )}
                  </div>

                  {/* VK Top-to-Bottom Trigger Button: "О сообществе" */}
                  <button
                    type="button"
                    onClick={() => setShowDetails((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-semibold flex items-center justify-between sm:justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>О сообществе</span>
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 4. VK TOP-TO-BOTTOM EXPANDABLE "О СООБЩЕСТВЕ" PANEL */}
              {showDetails && (
                <div className="px-4 sm:px-6 pb-5 pt-3.5 border-t border-[#2e2e2e] bg-[#1c1c1d] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#939393] uppercase tracking-wider">
                      Подробная информация
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDetails(false)}
                      className="text-xs text-[#71aaeb] hover:underline cursor-pointer"
                    >
                      Свернуть
                    </button>
                  </div>

                  {/* Описание */}
                  <div className="text-xs sm:text-[13px] text-[#e1e3e6] leading-relaxed whitespace-pre-wrap break-words">
                    {community.description || 'Описание сообщества пока не добавлено.'}
                  </div>

                  {/* Ссылка и привязанные чаты в стиле ВК */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#252526] border border-[#333334]">
                      <Globe className="w-3.5 h-3.5 text-[#71aaeb] shrink-0" />
                      <span className="text-xs text-[#71aaeb] font-mono truncate">
                        aurachat.app/c/{community.inviteCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2 py-0.5 rounded bg-[#0077FF] hover:bg-[#0066DD] text-white text-[11px] font-medium cursor-pointer shrink-0"
                      >
                        {isCopied ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>

                    {community.attachedChannelId && (
                      <button
                        type="button"
                        onClick={() => {
                          const chat = chats.find((c) => c.id === community.attachedChannelId);
                          if (chat && onSelectChat) {
                            onSelectChat(chat);
                            onClose();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#252526] hover:bg-[#2e2e2f] border border-[#333334] text-xs text-[#71aaeb] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>{community.attachedChannelTitle || 'Канал сообщества'}</span>
                      </button>
                    )}

                    {community.attachedGroupId && (
                      <button
                        type="button"
                        onClick={() => {
                          const chat = chats.find((c) => c.id === community.attachedGroupId);
                          if (chat && onSelectChat) {
                            onSelectChat(chat);
                            onClose();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#252526] hover:bg-[#2e2e2f] border border-[#333334] text-xs text-[#71aaeb] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{community.attachedGroupTitle || 'Беседа сообщества'}</span>
                      </button>
                    )}
                  </div>

                  {/* Контакты / Администрация (внутри «О сообществе») */}
                  <div className="pt-3 border-t border-[#2e2e2e] space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#939393]">
                        Контакты и администрация ({1 + extraModerators.length})
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={handleToggleHideAdmins}
                            className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#e1e3e6] flex items-center gap-1 cursor-pointer"
                          >
                            {community.hideAdmins ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-[#71aaeb]" />}
                            <span>{community.hideAdmins ? 'Админы скрыты' : 'Скрыть админов'}</span>
                          </button>

                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setShowModsModal(true)}
                              className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#71aaeb] cursor-pointer"
                            >
                              + Назначить модератора
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {community.hideAdmins && !canManage ? (
                      <div className="py-2.5 px-3 rounded-lg bg-[#252526] text-xs text-[#939393] flex items-center gap-2">
                        <EyeOff className="w-4 h-4 shrink-0" />
                        <span>Список администрации скрыт настройками сообщества</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Создатель */}
                        <div className="p-2.5 rounded-xl bg-[#252526] border border-[#303031] flex items-center justify-between gap-2">
                          <div
                            onClick={() =>
                              onOpenUserProfile?.({
                                id: community.ownerId,
                                name: ownerDisplayName,
                                username: ownerUsername,
                                avatar: ownerAvatar,
                                bio: `Создатель сообщества «${community.title}»`,
                                isOnline: true
                              })
                            }
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                          >
                            <img src={ownerAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white group-hover:text-[#71aaeb] truncate">
                                {ownerDisplayName}
                              </div>
                              <div className="text-[11px] text-[#939393] truncate">
                                Создатель · @{ownerUsername}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenUserProfile?.({
                                  id: community.ownerId,
                                  name: ownerDisplayName,
                                  username: ownerUsername,
                                  avatar: ownerAvatar,
                                  bio: `Создатель сообщества «${community.title}»`,
                                  isOnline: true
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#2f3031] hover:bg-[#3a3b3c] text-xs text-[#e1e3e6] cursor-pointer"
                            >
                              Профиль
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onMessageUser?.({
                                  id: community.ownerId,
                                  name: ownerDisplayName,
                                  username: ownerUsername,
                                  avatar: ownerAvatar
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-xs font-medium text-white cursor-pointer"
                            >
                              Написать
                            </button>
                          </div>
                        </div>

                        {/* Модераторы */}
                        {extraModerators.map((m) => (
                          <div
                            key={m.userId}
                            className="p-2.5 rounded-xl bg-[#252526] border border-[#303031] flex items-center justify-between gap-2"
                          >
                            <div
                              onClick={() =>
                                onOpenUserProfile?.({
                                  id: m.userId,
                                  name: m.displayName,
                                  username: m.username,
                                  avatar: m.avatarUrl,
                                  bio: `${m.customTitle || 'Модератор'} сообщества «${community.title}»`,
                                  isOnline: true
                                })
                              }
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                            >
                              <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white group-hover:text-[#71aaeb] truncate">
                                  {m.displayName}
                                </div>
                                <div className="text-[11px] text-[#939393] truncate">
                                  {m.customTitle || 'Модератор'} · @{m.username}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenUserProfile?.({
                                    id: m.userId,
                                    name: m.displayName,
                                    username: m.username,
                                    avatar: m.avatarUrl,
                                    bio: `${m.customTitle || 'Модератор'} сообщества «${community.title}»`,
                                    isOnline: true
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#2f3031] hover:bg-[#3a3b3c] text-xs text-[#e1e3e6] cursor-pointer"
                              >
                                Профиль
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onMessageUser?.({
                                    id: m.userId,
                                    name: m.displayName,
                                    username: m.username,
                                    avatar: m.avatarUrl
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-xs font-medium text-white cursor-pointer"
                              >
                                Написать
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* ОСНОВНОЙ БЛОК: ПОДПИСЧИКИ + БЫСТРАЯ ЗАПИСЬ + ВКЛАДКИ + СТЕНА     */}
            {/* ================================================================= */}
            <div className="space-y-3.5 min-w-0">
              
              {/* VK Widget: Подписчики (выше: между «О сообществе» и «Что у вас нового?») */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#222222] border border-[#2e2e2e] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#71aaeb]" />
                    <span className="text-xs sm:text-sm font-semibold text-white">Подписчики</span>
                  </div>
                  <span className="text-xs text-[#939393] font-medium">{community.subscribersCount}</span>
                </div>
                <div className="flex items-center gap-3.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {[
                    { name: ownerDisplayName, avatar: ownerAvatar },
                    ...sampleContactsForMods.map((c) => ({ name: c.displayName.split(' ')[0], avatar: c.avatarUrl }))
                  ]
                    .slice(0, 10)
                    .map((sub, i) => (
                      <div key={i} className="flex flex-col items-center text-center gap-1 shrink-0 w-14">
                        <img src={sub.avatar} alt="" className="w-11 h-11 rounded-full object-cover bg-[#2c2d2e] border border-[#3a3b3c]" />
                        <span className="text-[11px] text-[#e1e3e6] truncate w-full">{sub.name}</span>
                      </div>
                    ))}
                </div>
              </div>
                
              {/* VK Quick Wall Composer ("Что у вас нового?") */}
                {canManage && (
                  <div className="p-3.5 rounded-2xl bg-[#222222] border border-[#2e2e2e] flex items-center justify-between gap-3">
                    <div
                      onClick={() => setShowNewPostModal(true)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <img
                        src={community.avatarUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <span className="text-xs sm:text-[13px] text-[#939393] hover:text-[#e1e3e6] truncate">
                        Что у вас нового в «{community.title}»?
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPostAttachmentType('image');
                          setShowNewPostModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#2c2d2e] text-[#939393] hover:text-[#71aaeb] cursor-pointer"
                        title="Прикрепить фото или видео"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostAttachmentType('music');
                          setShowNewPostModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#2c2d2e] text-[#939393] hover:text-[#71aaeb] cursor-pointer"
                        title="Прикрепить музыку"
                      >
                        <Music className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostAttachmentType('poll');
                          setShowNewPostModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#2c2d2e] text-[#939393] hover:text-[#71aaeb] cursor-pointer"
                        title="Создать опрос"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* VK Content Tabs & Wall Section */}
                <div className="rounded-2xl bg-[#222222] border border-[#2e2e2e] overflow-hidden">
                  
                  {/* VK Tabs Row Header (All tabs 100% visible with flex-wrap) */}
                  <div className="px-3.5 py-2.5 border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2 bg-[#222222]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeTabsList.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTab(t.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === t.id
                              ? 'bg-[#2c2d2e] text-white border border-[#3a3b3c]'
                              : 'text-[#939393] hover:text-white hover:bg-[#292929]'
                          }`}
                        >
                          {t.id === 'posts' && <ImageIcon className="w-3.5 h-3.5 text-[#71aaeb]" />}
                          {t.id === 'clips' && <Film className="w-3.5 h-3.5 text-[#71aaeb]" />}
                          {t.id === 'videos' && <Video className="w-3.5 h-3.5 text-[#71aaeb]" />}
                          {t.id === 'events' && <Calendar className="w-3.5 h-3.5 text-[#71aaeb]" />}
                          {t.id === 'home' && <Grid className="w-3.5 h-3.5 text-[#71aaeb]" />}
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>

                    {canManage && (
                      <button
                        onClick={handleOpenTabEditor}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
                        title="Настроить вкладки сообщества"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Вкладки</span>
                      </button>
                    )}
                  </div>

                  {/* TAB CONTENT 1: ЗАПИСИ / ПОСТЫ В СТИЛЕ СТЕНЫ ВКОНТАКТЕ */}
                  {activeTab === 'posts' && (
                    <div className="divide-y divide-[#2e2e2e]">
                      {communityPosts.length > 0 ? (
                        communityPosts.map((post) => {
                          const isLiked = post.isLiked !== undefined ? Boolean(post.isLiked) : Boolean(likedPostsMap[post.id]);
                          const displayLikes = post.isLiked !== undefined
                            ? post.likesCount
                            : post.likesCount + (likedPostsMap[post.id] ? 1 : 0);
                          const displayViews = post.viewsCount ?? 0;
                          const currentAttachedMedia = commentMedia[post.id];

                          return (
                            <div key={post.id} className="p-4 sm:p-5 bg-[#222222] space-y-3">
                              {/* VK Post Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div
                                  className="flex items-center gap-3 cursor-pointer group min-w-0"
                                  onClick={() => {
                                    if (post.userId !== community.id) {
                                      onOpenUserProfile?.({
                                        id: post.userId,
                                        name: post.userName,
                                        username: post.userName.toLowerCase().replace(/\s+/g, '_'),
                                        avatar: post.userAvatar || community.avatarUrl,
                                        isOnline: true
                                      });
                                    }
                                  }}
                                >
                                  <img
                                    src={post.userAvatar || community.avatarUrl}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-[#e1e3e6] group-hover:text-[#71aaeb] truncate">
                                      {post.userName}
                                    </div>
                                    <div className="text-xs text-[#828282]">{formatSmartTime(post.createdAt, post.id, nowTick)}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {post.mediaUrl && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFullscreenMedia({
                                            url: post.mediaUrl,
                                            type: post.mediaType === 'video' ? 'video' : 'image',
                                            title: post.caption || community.title
                                          })
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#71aaeb] flex items-center gap-1 cursor-pointer"
                                        title="Открыть медиа на весь экран"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">На весь экран</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          downloadMediaFile(
                                            post.mediaUrl,
                                            `aurachat_${community.title}_${post.id}`,
                                            post.mediaType === 'video' ? 'video' : 'image'
                                          )
                                        }
                                        className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white cursor-pointer"
                                        title="Скачать файл"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {onDeletePost && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playReactionSound();
                                        onDeletePost(post.id);
                                      }}
                                      className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-rose-500/20 text-[#939393] hover:text-rose-400 transition cursor-pointer"
                                      title="Удалить публикацию навсегда"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* VK Post Text */}
                              {post.caption && (
                                <p className="text-[13px] sm:text-sm text-[#e1e3e6] whitespace-pre-wrap break-words leading-relaxed">
                                  {post.caption}
                                </p>
                              )}

                              {/* VK Post Media (Uncropped Full View & Multi-Media Grid for up to 10 photos/videos) */}
                              {((post.images && post.images.length > 0) || post.mediaUrl) && (() => {
                                const mediaList: string[] = post.images && post.images.length > 0
                                  ? post.images
                                  : (post.mediaUrl ? [post.mediaUrl] : []);

                                if (mediaList.length === 0) return null;

                                if (mediaList.length === 1) {
                                  const mUrl = mediaList[0];
                                  const isVid = post.mediaType === 'video' || mUrl.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(mUrl);
                                  return (
                                    <div className="rounded-xl overflow-hidden border border-[#2e2e2e] bg-[#141414] flex items-center justify-center">
                                      {isVid ? (
                                        <video
                                          src={mUrl}
                                          controls
                                          className="w-full max-h-[540px] object-contain"
                                        />
                                      ) : (
                                        <img
                                          src={mUrl}
                                          alt=""
                                          onClick={() =>
                                            setFullscreenMedia({
                                              url: mUrl,
                                              type: 'image',
                                              title: post.caption || community.title
                                            })
                                          }
                                          className="w-full max-h-[540px] object-contain cursor-zoom-in"
                                          title="Нажмите, чтобы открыть фото полностью"
                                        />
                                      )}
                                    </div>
                                  );
                                }

                                // 2+ media items: adaptive VK grid
                                return (
                                  <div
                                    className={`grid gap-1.5 sm:gap-2 rounded-xl overflow-hidden border border-[#2e2e2e] bg-[#141414] p-1.5 ${
                                      mediaList.length === 2
                                        ? 'grid-cols-2'
                                        : mediaList.length === 3
                                        ? 'grid-cols-3'
                                        : 'grid-cols-2 sm:grid-cols-3'
                                    }`}
                                  >
                                    {mediaList.map((mUrl, mIdx) => {
                                      const isVid = mUrl.startsWith('data:video/') || /\.(mp4|webm|mov|ogg)($|\?)/i.test(mUrl);
                                      return (
                                        <div
                                          key={mIdx}
                                          className="relative aspect-video sm:aspect-square bg-[#19191a] rounded-lg overflow-hidden border border-[#2a2a2b] flex items-center justify-center group"
                                        >
                                          {isVid ? (
                                            <video
                                              src={mUrl}
                                              controls
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <img
                                              src={mUrl}
                                              alt=""
                                              onClick={() =>
                                                setFullscreenMedia({
                                                  url: mUrl,
                                                  type: 'image',
                                                  title: post.caption || community.title
                                                })
                                              }
                                              className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-200"
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* Attached File */}
                              {post.attachedFile && (
                                <div className="p-3 rounded-xl bg-[#2c2d2e] flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-[#71aaeb] truncate">
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="truncate font-medium">{post.attachedFile.name}</span>
                                  </div>
                                  <span className="text-[11px] text-[#939393]">{post.attachedFile.size}</span>
                                </div>
                              )}

                              {/* VK Post Footer Bar (Честные лайки 0+, Комментарии, Поделиться + Честные просмотры 0+) */}
                              <div className="pt-1 flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playReactionSound();
                                      if (onToggleLikePost) {
                                        onToggleLikePost(post.id);
                                      } else {
                                        setLikedPostsMap((prev) => ({
                                          ...prev,
                                          [post.id]: !prev[post.id]
                                        }));
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                                      isLiked
                                        ? 'bg-rose-500/20 text-rose-400'
                                        : 'bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-[#e1e3e6]'
                                    }`}
                                    title="Нравится"
                                  >
                                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
                                    <span>{displayLikes}</span>
                                  </button>

                                  <div className="px-3 py-1.5 rounded-full bg-[#2c2d2e] text-[#939393] text-xs font-semibold flex items-center gap-1.5">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>{post.comments?.length || 0}</span>
                                    <span className="hidden sm:inline">Комментарии</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="px-3 py-1.5 rounded-full bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-[#e1e3e6] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                    title="Поделиться записью"
                                  >
                                    <Share2 className="w-4 h-4" />
                                    <span>Поделиться</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-[#828282]" title="Просмотры записи">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{displayViews}</span>
                                </div>
                              </div>

                              {/* VK Comments Section (Список комментариев + Поле ввода комментария) */}
                              <div className="pt-2.5 border-t border-[#2e2e2e] space-y-2.5">
                                {post.comments && post.comments.length > 0 && (
                                  <div className="space-y-2">
                                    {post.comments.map((c) => (
                                      <div
                                        key={c.id}
                                        className="p-2.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] text-xs space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <img
                                              src={c.userAvatar}
                                              alt={c.userName}
                                              className="w-6 h-6 rounded-full object-cover shrink-0"
                                            />
                                            <span className="font-semibold text-[#71aaeb] truncate">
                                              {c.userName}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] text-[#828282]">{c.createdAt}</span>
                                            {onDeleteComment && (
                                              <button
                                                type="button"
                                                onClick={() => onDeleteComment(post.id, c.id)}
                                                className="p-1 rounded hover:bg-rose-500/20 text-[#828282] hover:text-rose-400 cursor-pointer"
                                                title="Удалить комментарий"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {c.content && (
                                          <div className="text-[#e1e3e6] pl-8 break-words">{c.content}</div>
                                        )}

                                        {c.mediaUrl && (
                                          <div className="pl-8 pt-1">
                                            <img
                                              src={c.mediaUrl}
                                              alt=""
                                              onClick={() =>
                                                setFullscreenMedia({
                                                  url: c.mediaUrl!,
                                                  type: 'image',
                                                  title: c.content
                                                })
                                              }
                                              className="max-h-44 rounded-lg object-contain border border-[#2e2e2e] bg-black cursor-zoom-in"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {currentAttachedMedia && (
                                  <div className="flex items-center gap-2 p-2 bg-[#19191a] border border-[#2e2e2e] rounded-xl w-fit">
                                    <img
                                      src={currentAttachedMedia.url}
                                      alt=""
                                      className="w-10 h-10 object-cover rounded-lg"
                                    />
                                    <span className="text-[11px] text-[#e1e3e6]">Прикреплено фото</span>
                                    <button
                                      type="button"
                                      onClick={() => setCommentMedia((prev) => ({ ...prev, [post.id]: null }))}
                                      className="p-1 rounded-full hover:bg-[#2c2d2e] text-[#828282] hover:text-white cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Поле ввода комментария под постом сообщества */}
                                <div className="flex items-center gap-2">
                                  <img
                                    src={currentUser.avatarUrl}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover shrink-0 hidden sm:block"
                                  />
                                  <label
                                    className="p-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#828282] hover:text-white cursor-pointer shrink-0"
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

                                  <input
                                    type="text"
                                    placeholder="Написать комментарий..."
                                    value={commentInputs[post.id] || ''}
                                    onChange={(e) =>
                                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                                    }
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCommunityComment(post.id)}
                                    className="flex-1 bg-[#2c2d2e] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#0077FF] border border-transparent placeholder-[#828282]"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleAddCommunityComment(post.id)}
                                    className="p-2 bg-[#0077FF] hover:bg-[#0066DD] rounded-lg text-white cursor-pointer shrink-0"
                                    title="Отправить комментарий"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center space-y-2.5">
                          <ImageIcon className="w-8 h-8 text-[#828282] mx-auto" />
                          <p className="text-xs sm:text-sm text-[#e1e3e6] font-medium">На стене пока нет ни одной записи</p>
                          {canManage && (
                            <button
                              onClick={() => setShowNewPostModal(true)}
                              className="px-4 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer"
                            >
                              Опубликовать первую запись
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT 2: РАЗДЕЛ «ВИДЕО» В СТИЛЕ VK ВИДЕО (vk.ru/video) */}
                  {activeTab === 'videos' && (
                    <div className="p-3.5 sm:p-5 space-y-4 bg-[#222222]">
                      
                      {/* VK Video Top Header Bar (Никогда не съезжает и не переносит кнопки на 3 строки) */}
                      <div className="p-3 sm:p-3.5 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#0077FF]/15 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-[#0077FF]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-bold text-white truncate">Видеозаписи</span>
                              <span className="text-xs text-[#828282] font-mono tabular-nums">{communityVideos.length}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {communityVideos.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDeleteAllVideos}
                              className="px-3 py-2 rounded-lg bg-[#2c2d2e] hover:bg-rose-500/20 text-[#e1e3e6] hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap shrink-0"
                              title="Удалить все видео из сообщества"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                              <span>Удалить все</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal('video')}
                            className="px-3.5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>Добавить видео</span>
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const youtubeVideos = communityVideos;
                        const playlists = Array.from(new Set(youtubeVideos.map((v) => v.playlist || 'Общие')));

                        // Filter by Search, Playlist and Sort
                        let filtered = youtubeVideos.filter((v) => {
                          const matchesQuery =
                            !videoSearchQuery.trim() ||
                            v.title.toLowerCase().includes(videoSearchQuery.toLowerCase()) ||
                            (v.description && v.description.toLowerCase().includes(videoSearchQuery.toLowerCase()));
                          const matchesPlaylist =
                            selectedVideoCategory === 'all' || (v.playlist || 'Общие') === selectedVideoCategory;
                          return matchesQuery && matchesPlaylist;
                        });

                        if (videoSortBy === 'views') {
                          filtered = [...filtered].sort((a, b) => b.viewsCount - a.viewsCount);
                        } else if (videoSortBy === 'likes') {
                          filtered = [...filtered].sort((a, b) => b.likesCount - a.likesCount);
                        } else {
                          filtered = [...filtered].sort(
                            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* VK Video Search Bar + Playlists Tabs + Sorting */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e]">
                              {/* Search */}
                              <div className="relative flex-1 min-w-0">
                                <Search className="w-4 h-4 text-[#828282] absolute left-3 top-2.5" />
                                <input
                                  type="text"
                                  value={videoSearchQuery}
                                  onChange={(e) => setVideoSearchQuery(e.target.value)}
                                  placeholder="Поиск по видеозаписям..."
                                  className="w-full bg-[#222222] text-xs text-white rounded-lg pl-9 pr-8 py-2 border border-[#2e2e2e] focus:border-[#0077FF] outline-none placeholder-[#828282]"
                                />
                                {videoSearchQuery && (
                                  <button
                                    onClick={() => setVideoSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-[#828282] hover:text-white cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Playlists Filter Buttons */}
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedVideoCategory('all')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                                    selectedVideoCategory === 'all'
                                      ? 'bg-[#0077FF] text-white'
                                      : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                                  }`}
                                >
                                  Все видео ({youtubeVideos.length})
                                </button>
                                {playlists.map((pl) => (
                                  <button
                                    key={pl}
                                    type="button"
                                    onClick={() => setSelectedVideoCategory(pl)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition ${
                                      selectedVideoCategory === pl
                                        ? 'bg-[#0077FF] text-white'
                                        : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                                    }`}
                                  >
                                    {pl}
                                  </button>
                                ))}
                              </div>

                              {/* Sorting */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Filter className="w-3.5 h-3.5 text-[#828282]" />
                                <select
                                  value={videoSortBy}
                                  onChange={(e) => setVideoSortBy(e.target.value as any)}
                                  className="bg-[#222222] text-xs text-[#e1e3e6] rounded-lg px-2.5 py-1.5 border border-[#2e2e2e] outline-none cursor-pointer"
                                >
                                  <option value="newest">Сначала новые</option>
                                  <option value="views">По просмотрам</option>
                                  <option value="likes">По лайкам</option>
                                </select>
                              </div>
                            </div>

                            {/* VK Video Grid */}
                            {filtered.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.map((vid) => {
                                  const privacyType = vid.privacy || 'public';
                                  return (
                                    <div
                                      key={vid.id}
                                      onClick={() => handleOpenVideoPlayer(vid)}
                                      className="group bg-[#19191a] hover:bg-[#202022] rounded-xl overflow-hidden border border-[#2e2e2e] hover:border-[#3d3d40] transition cursor-pointer flex flex-col relative"
                                    >
                                      {/* VK Video Thumbnail with Hover-Only Play Button (чтоб не мешался предпросмотром видео) */}
                                      <div
                                        className="relative aspect-video bg-[#101011] overflow-hidden"
                                        onMouseEnter={(e) => {
                                          const previewVid = e.currentTarget.querySelector('video');
                                          if (previewVid) {
                                            previewVid.play().catch(() => {});
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          const previewVid = e.currentTarget.querySelector('video');
                                          if (previewVid) {
                                            previewVid.pause();
                                            previewVid.currentTime = 0;
                                          }
                                        }}
                                      >
                                        {vid.coverUrl ? (
                                          <img
                                            src={vid.coverUrl}
                                            alt={vid.title}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <video
                                            src={vid.mediaUrl}
                                            muted
                                            playsInline
                                            preload="metadata"
                                            className="w-full h-full object-cover"
                                          />
                                        )}

                                        {/* Play Icon Overlay: СКРЫТ по умолчанию, появляется ТОЛЬКО при наведении курсора и исчезает при отведении */}
                                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                                          <div className="w-12 h-12 rounded-full bg-[#0077FF]/95 text-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform duration-200">
                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                          </div>
                                        </div>

                                        {/* Top-Left Visibility Status Badge */}
                                        {privacyType !== 'public' && (
                                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[#e1e3e6] text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm">
                                            {privacyType === 'private' ? (
                                              <>
                                                <Lock className="w-3 h-3 text-rose-400" />
                                                <span>Закрытый</span>
                                              </>
                                            ) : (
                                              <>
                                                <Link2 className="w-3 h-3 text-amber-400" />
                                                <span>По ссылке</span>
                                              </>
                                            )}
                                          </span>
                                        )}

                                        {/* Bottom-Right Playlist Tag */}
                                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-medium">
                                          {vid.playlist || 'Общие'}
                                        </span>
                                      </div>

                                      {/* VK Video Card Info + Bottom-Right Edit Button */}
                                      <div className="p-3 flex items-start justify-between gap-2.5 flex-1">
                                        <img
                                          src={vid.userAvatar || community.avatarUrl}
                                          alt={vid.userName}
                                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#2e2e2e] mt-0.5"
                                        />

                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <h3 className="text-xs sm:text-[13px] font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#71aaeb] transition-colors">
                                            {vid.title}
                                          </h3>
                                          <p className="text-[11px] text-[#939393] truncate">{vid.userName}</p>
                                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[#828282] tabular-nums pt-0.5">
                                            <span className="flex items-center gap-1">
                                              <Eye className="w-3 h-3 text-[#71aaeb]" /> {vid.viewsCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Heart className="w-3 h-3 text-rose-400" /> {vid.likesCount}
                                            </span>
                                            <span>· {formatSmartTime(vid.createdAt, vid.id, nowTick)}</span>
                                          </div>
                                        </div>

                                        {/* Кнопка Редактировать ПЕРЕМЕЩЕНА В ПРАВЫЙ НИЖНИЙ УГОЛ карточки */}
                                        <div className="shrink-0 self-end ml-1">
                                          <button
                                            type="button"
                                            onClick={(e) => handleOpenEditVideo(vid, e)}
                                            className="p-2 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-[#e1e3e6] hover:text-white transition cursor-pointer shadow-sm flex items-center justify-center"
                                            title="Редактировать видео (название, плейлист, обложка, видимость, удалить)"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-8 rounded-xl bg-[#19191a] border border-[#2e2e2e] text-center space-y-3">
                                <Video className="w-10 h-10 text-[#0077FF] mx-auto opacity-80" />
                                <h3 className="text-sm font-bold text-white">Видеозаписи пока не добавлены</h3>
                                <p className="text-xs text-[#939393] max-w-sm mx-auto">
                                  Загружайте видеоролики, устанавливайте обложки, распределяйте по плейлистам и настраивайте доступ.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenUploadModal('video')}
                                  className="px-4 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  Добавить первое видео
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  )}


                  {/* TAB CONTENT 4: СОБЫТИЯ */}
                  {activeTab === 'events' && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#71aaeb]" />
                          <span>Мероприятия и трансляции</span>
                        </span>
                        {canManage && (
                          <button
                            onClick={() => setShowEventModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-medium cursor-pointer"
                          >
                            + Создать событие
                          </button>
                        )}
                      </div>

                      {(community.events || []).length > 0 ? (
                        community.events!.map((evt) => (
                          <div key={evt.id} className="p-3.5 rounded-xl bg-[#292929] border border-[#333334] flex items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="text-xs sm:text-sm font-semibold text-white truncate">{evt.title}</div>
                              <div className="text-xs text-[#71aaeb] font-medium">{evt.date}</div>
                              {evt.description && <div className="text-xs text-[#939393]">{evt.description}</div>}
                              <div className="text-[11px] text-[#828282]">Участников: {evt.attendeesCount}</div>
                            </div>

                            <button
                              onClick={() => handleToggleEventAttendance(evt.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 ${
                                evt.isAttending
                                  ? 'bg-[#2c2d2e] text-[#71aaeb]'
                                  : 'bg-[#0077FF] text-white'
                              }`}
                            >
                              {evt.isAttending ? '✓ Вы пойдёте' : 'Пойду'}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <Calendar className="w-8 h-8 text-[#828282] mx-auto" />
                          <p className="text-xs sm:text-sm text-[#e1e3e6] font-medium">Нет предстоящих мероприятий</p>
                          <p className="text-xs text-[#828282]">Администраторы могут планировать встречи и эфиры сообщества.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT 5: ГЛАВНАЯ */}
                  {activeTab === 'home' && (
                    <div className="p-8 text-center space-y-2">
                      <Grid className="w-8 h-8 text-[#71aaeb] mx-auto" />
                      <p className="text-xs sm:text-sm text-[#e1e3e6] font-medium">Обзор сообщества</p>
                      <p className="text-xs text-[#828282]">Главные закреплённые материалы, обсуждения и витрина сообщества.</p>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 0: ДОБАВИТЬ ЧЕЛОВЕКА, ПРИВАТНАЯ ССЫЛКА ИЛИ QR-КОД СООБЩЕСТВА */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-[#1c1c20] border border-[#333338] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 text-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-[#2c2d2e] text-[#939393] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <img
                src={community.avatarUrl}
                alt={community.title}
                className="w-11 h-11 rounded-2xl object-cover border border-[#333338]"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{community.title}</h3>
                <p className="text-[11px] text-[#71aaeb]">
                  {community.isPrivate ? '🔒 Приватное сообщество (вход по ссылке или QR)' : '🌐 Открытое сообщество'}
                </p>
              </div>
            </div>

            {/* 3 Tabs: Добавить человека | Ссылка | QR-код */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#141416] p-1 rounded-2xl border border-[#2a2a2e]">
              <button
                type="button"
                onClick={() => setInviteModalTab('add_person')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  inviteModalTab === 'add_person'
                    ? 'bg-[#0077FF] text-white shadow'
                    : 'text-[#939393] hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Добавить</span>
              </button>
              <button
                type="button"
                onClick={() => setInviteModalTab('link')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  inviteModalTab === 'link'
                    ? 'bg-[#0077FF] text-white shadow'
                    : 'text-[#939393] hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Ссылка</span>
              </button>
              <button
                type="button"
                onClick={() => setInviteModalTab('qr')}
                className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  inviteModalTab === 'qr'
                    ? 'bg-[#0077FF] text-white shadow'
                    : 'text-[#939393] hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR-код</span>
              </button>
            </div>

            {inviteModalTab === 'add_person' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {sampleContactsForMods.map((c) => {
                    const isSub =
                      community.subscribersUserIds.includes(c.userId) || addedUserIdsLocal[c.userId];
                    return (
                      <div
                        key={c.userId}
                        className="p-2.5 rounded-xl bg-[#252529] border border-[#333338] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={c.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{c.displayName}</div>
                            <div className="text-[11px] text-[#828282] truncate">@{c.username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isSub}
                          onClick={() => {
                            playSentSound();
                            setAddedUserIdsLocal((prev) => ({ ...prev, [c.userId]: true }));
                            if (!community.subscribersUserIds.includes(c.userId)) {
                              const nextSubs = [...community.subscribersUserIds, c.userId];
                              onUpdateCommunity({
                                ...community,
                                subscribersUserIds: nextSubs,
                                subscribersCount: Math.max(community.subscribersCount + 1, nextSubs.length),
                                updatedAt: Date.now()
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            isSub
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                          }`}
                        >
                          {isSub ? '✓ Добавлен' : '+ Добавить'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Добавить по @username */}
                <div className="pt-2 border-t border-[#2e2e32] flex items-center gap-2">
                  <input
                    type="text"
                    value={customInviteUsername}
                    onChange={(e) => setCustomInviteUsername(e.target.value)}
                    placeholder="Введите имя или @username..."
                    className="flex-1 bg-[#252529] border border-[#34343a] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#0077FF]"
                  />
                  <button
                    type="button"
                    disabled={!customInviteUsername.trim()}
                    onClick={() => {
                      const clean = customInviteUsername.trim();
                      if (!clean) return;
                      playSentSound();
                      const uid = 'usr_invited_' + Date.now();
                      const nextSubs = [...community.subscribersUserIds, uid];
                      onUpdateCommunity({
                        ...community,
                        subscribersUserIds: nextSubs,
                        subscribersCount: community.subscribersCount + 1,
                        updatedAt: Date.now()
                      });
                      setCustomInviteUsername('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            )}

            {inviteModalTab === 'link' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#2e2e32] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#71aaeb] block">
                    {community.isPrivate ? 'Приватная ссылка для приглашения' : 'Публичная ссылка сообщества'}
                  </span>
                  <div className="text-xs font-mono text-white break-all bg-[#222226] p-2.5 rounded-xl border border-[#333338]">
                    {`https://aurachat.app/community/join?code=${community.inviteCode}`}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
                  </button>
                </div>
              </div>
            )}

            {inviteModalTab === 'qr' && (
              <div className="space-y-3 text-center">
                <div className="bg-white p-4 rounded-3xl w-52 h-52 mx-auto flex items-center justify-center shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                      `https://aurachat.app/community/join?code=${community.inviteCode}`
                    )}&bgcolor=ffffff&color=0f172a&margin=8`}
                    alt="QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <p className="text-xs text-[#939393]">
                  Отсканируйте QR-код камерой телефона для мгновенного входа в «{community.title}»
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-white text-xs font-bold cursor-pointer"
                >
                  {isCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку под QR'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: PUBLISH POST TO COMMUNITY FORM */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-md w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowNewPostModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              <span>Приложить пост в {community.title}</span>
            </h3>

            {/* Author Mode Selector: От имени сообщества | От своего имени */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Публиковать от имени:</span>
              <div className="grid grid-cols-2 gap-2 bg-[#1e2a38] p-1.5 rounded-2xl border border-[#283748]">
                <button
                  type="button"
                  onClick={() => setPostAuthorMode('community')}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                    postAuthorMode === 'community'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-[#17212b] text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <img src={community.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate">От сообщества</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPostAuthorMode('user')}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                    postAuthorMode === 'user'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-[#17212b] text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <img src={currentUser.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate">От своего имени</span>
                </button>
              </div>
            </div>

            <div>
              <textarea
                placeholder="Текст записи (необязательно при наличии фото или видео)..."
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                rows={3}
                className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-2xl border border-[#283748] outline-none focus:border-[#5288c1] transition placeholder-slate-400"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5 px-1">
                * Текст необязателен: можно опубликовать только фото или видео.
              </span>
            </div>

            {/* Attached Photos Preview Grid (up to 10 photos) */}
            {postPhotos.length > 0 && (
              <div className="space-y-1.5 p-2.5 rounded-2xl bg-[#1e2a38] border border-cyan-500/30">
                <div className="flex items-center justify-between text-[11px] text-cyan-300 font-bold px-1">
                  <span>Прикреплённые фото ({postPhotos.length}/10):</span>
                  {postPhotos.length < 10 && (
                    <span className="text-[10px] text-slate-400 font-normal">можно добавить ещё {10 - postPhotos.length}</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto scrollbar-thin p-0.5">
                  {postPhotos.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-cyan-500/30 group">
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPostPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition cursor-pointer"
                        title="Удалить фото"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attached Videos Preview Grid (up to 10 videos/clips) */}
            {postVideos.length > 0 && (
              <div className="space-y-1.5 p-2.5 rounded-2xl bg-[#1e2a38] border border-indigo-500/30">
                <div className="flex items-center justify-between text-[11px] text-indigo-300 font-bold px-1">
                  <span>Прикреплённые видео / ролики ({postVideos.length}/10):</span>
                  {postVideos.length < 10 && (
                    <span className="text-[10px] text-slate-400 font-normal">можно добавить ещё {10 - postVideos.length}</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto scrollbar-thin p-0.5">
                  {postVideos.map((vidUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-indigo-500/30 bg-black group flex items-center justify-center">
                      <video src={vidUrl} className="w-full h-full object-cover opacity-80" />
                      <Video className="w-4 h-4 text-white absolute pointer-events-none drop-shadow" />
                      <button
                        type="button"
                        onClick={() => setPostVideos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition cursor-pointer"
                        title="Удалить видео"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Attachment Toolbar: Фото (до 10), Видео (до 10), Файл, Музыка, Опрос */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-bold block">Прикрепить к посту:</span>
              <div className="grid grid-cols-5 gap-1.5 bg-[#1e2a38] p-1.5 rounded-2xl border border-[#283748]">
                {/* 1. Photos (up to 10) */}
                <label
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postPhotos.length > 0
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                  title="Прикрепить до 10 фотографий"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Фото {postPhotos.length > 0 ? `(${postPhotos.length}/10)` : '(до 10)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={postPhotos.length >= 10}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const remaining = Math.max(0, 10 - postPhotos.length);
                      const sliceFiles = Array.from(files).slice(0, remaining);
                      sliceFiles.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setPostPhotos((prev) => prev.length < 10 ? [...prev, ev.target!.result as string] : prev);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                {/* 2. Videos (up to 10) */}
                <label
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postVideos.length > 0
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                  title="Прикрепить до 10 видеороликов"
                >
                  <Video className="w-4 h-4 text-indigo-400" />
                  <span>Видео {postVideos.length > 0 ? `(${postVideos.length}/10)` : '(до 10)'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    disabled={postVideos.length >= 10}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const remaining = Math.max(0, 10 - postVideos.length);
                      const sliceFiles = Array.from(files).slice(0, remaining);
                      sliceFiles.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setPostVideos((prev) => prev.length < 10 ? [...prev, ev.target!.result as string] : prev);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                {/* 3. Document File */}
                <label
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postAttachmentType === 'file' || postAttachedFile
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <Paperclip className="w-4 h-4 text-emerald-400" />
                  <span>Файл</span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPostAttachedFile({
                          name: file.name,
                          url: URL.createObjectURL(file),
                          size: `${(file.size / 1024).toFixed(1)} KB`
                        });
                        setPostAttachmentType('file');
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* 4. Music Track */}
                <button
                  type="button"
                  onClick={() => {
                    if (postAttachmentType === 'music' || postMusic) {
                      setPostMusic(null);
                      setPostAttachmentType('none');
                    } else {
                      setPostMusic({
                        id: 'm_comm_' + Date.now(),
                        title: 'AuraChat Community Anthem',
                        artist: 'Official Synth',
                        duration: '3:15',
                        genre: 'synthwave'
                      });
                      setPostAttachmentType('music');
                    }
                  }}
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postAttachmentType === 'music' || postMusic
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>Музыка</span>
                </button>

                {/* 5. Poll */}
                <button
                  type="button"
                  onClick={() => setPostAttachmentType(postAttachmentType === 'poll' ? 'none' : 'poll')}
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postAttachmentType === 'poll'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <span>Опрос</span>
                </button>
              </div>
            </div>

            {/* Poll Creation Sub-form */}
            {postAttachmentType === 'poll' && (
              <div className="p-3 bg-[#1e2a38] border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" />
                  <span>Создание опроса для сообщества:</span>
                </div>
                <input
                  type="text"
                  placeholder="Вопрос опроса..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2 rounded-xl border border-[#283748] outline-none"
                />
                <input
                  type="text"
                  placeholder="Вариант 1..."
                  value={pollOption1}
                  onChange={(e) => setPollOption1(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2 rounded-xl border border-[#283748] outline-none"
                />
                <input
                  type="text"
                  placeholder="Вариант 2..."
                  value={pollOption2}
                  onChange={(e) => setPollOption2(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2 rounded-xl border border-[#283748] outline-none"
                />
              </div>
            )}

            {/* Submit button: active if there is text OR at least 1 photo OR at least 1 video OR poll OR music OR file */}
            <button
              onClick={handlePublishPostSubmit}
              disabled={
                !postCaption.trim() &&
                postPhotos.length === 0 &&
                postVideos.length === 0 &&
                !pollQuestion.trim() &&
                !postMusic &&
                !postAttachedFile &&
                !postMediaUrl.trim()
              }
              className="w-full py-3 rounded-2xl bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Опубликовать запись {postPhotos.length > 0 || postVideos.length > 0 ? `(${postPhotos.length + postVideos.length} медиа)` : ''} →
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT COMMUNITY DETAILS FORM (Только Создатель и Модераторы) */}
      {showEditModal && canManage && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              <span>Редактировать сообщество (Создатель / Модератор)</span>
            </h3>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Название:</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none"
              />
            </div>

            {/* Custom Avatar Photo Upload */}
            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">Иконка сообщества (аватар):</label>
              <div className="flex items-center gap-3 bg-[#1e2a38] p-2.5 rounded-2xl border border-[#283748]">
                <img
                  src={editAvatarUrl || community.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-cyan-400 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <label className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Загрузить свою фотку</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setEditAvatarUrl(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">Выберите файл с вашего устройства</p>
                </div>
              </div>
            </div>

            {/* Custom Banner (Шапка сообщества) Upload & Presets */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 font-bold block">Баннер сообщества (шапка):</label>
              <div className="bg-[#1e2a38] p-3 rounded-2xl border border-[#283748] space-y-2.5">
                {editBannerUrl ? (
                  <div className="relative h-24 w-full rounded-xl overflow-hidden border border-[#283748]">
                    <img src={editBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditBannerUrl('')}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white text-[10px] font-bold transition cursor-pointer"
                    >
                      Сбросить
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-full rounded-xl bg-gradient-to-r from-cyan-900/50 via-blue-900/40 to-indigo-950/60 border border-[#283748] flex items-center justify-center text-[11px] text-slate-400">
                    Стандартный градиентный баннер
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Загрузить свой баннер</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setEditBannerUrl(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preset Banners */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Готовые баннеры:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {presetBanners.map((bUrl, idx) => (
                      <button
                        key={bUrl}
                        type="button"
                        onClick={() => setEditBannerUrl(bUrl)}
                        className={`h-11 rounded-xl overflow-hidden border transition cursor-pointer relative ${
                          editBannerUrl === bUrl
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                            : 'border-[#283748] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={bUrl} alt={`Баннер ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white font-bold py-0.5 truncate px-1">
                          Баннер {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Background (Фон страницы сообщества) Upload & Presets */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 font-bold block">Фон страницы сообщества:</label>
              <div className="bg-[#1e2a38] p-3 rounded-2xl border border-[#283748] space-y-2.5">
                {editBackgroundUrl && (
                  <div className="relative h-20 w-full rounded-xl overflow-hidden border border-[#283748]">
                    <img src={editBackgroundUrl} alt="Background Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditBackgroundUrl('')}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white text-[10px] font-bold transition cursor-pointer"
                    >
                      Убрать фон
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Загрузить свой фон</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setEditBackgroundUrl(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preset Backgrounds */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">Готовые фоны:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {presetBackgrounds.map((bg) => (
                      <button
                        key={bg.label}
                        type="button"
                        onClick={() => setEditBackgroundUrl(bg.value)}
                        className={`h-11 rounded-xl overflow-hidden border transition cursor-pointer relative ${
                          editBackgroundUrl === bg.value
                            ? 'border-purple-400 ring-2 ring-purple-400/40'
                            : 'border-[#283748] opacity-80 hover:opacity-100'
                        }`}
                      >
                        {bg.value ? (
                          <img src={bg.value} alt={bg.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#0e1621] flex items-center justify-center text-[9px] text-slate-400 font-bold">
                            Стандарт
                          </div>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white font-bold py-0.5 truncate px-1">
                          {bg.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">О сообществе (описание):</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Привязать Канал:</label>
                <select
                  value={editAttachedChannelId}
                  onChange={(e) => setEditAttachedChannelId(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none"
                >
                  <option value="">Без канала</option>
                  {channelChats.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">Привязать Группу:</label>
                <select
                  value={editAttachedGroupId}
                  onChange={(e) => setEditAttachedGroupId(e.target.value)}
                  className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none"
                >
                  <option value="">Без группы</option>
                  {groupChats.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hide Creator and Moderators Option */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1e2a38] border border-[#283748]">
              <div>
                <span className="text-xs font-bold text-white block">Скрыть создателя и модераторов</span>
                <span className="text-[10px] text-slate-400">Обычные участники не увидят список администрации</span>
              </div>
              <input
                type="checkbox"
                checked={editHideAdmins}
                onChange={(e) => setEditHideAdmins(e.target.checked)}
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1e2a38] border border-[#283748]">
              <span className="text-xs font-bold text-white">Приватное сообщество (по ссылке)</span>
              <input
                type="checkbox"
                checked={editIsPrivate}
                onChange={(e) => setEditIsPrivate(e.target.checked)}
                className="w-5 h-5 accent-[#5288c1] cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveEdit}
              className="w-full py-3 rounded-2xl bg-[#5288c1] hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE MODERATORS (Ручное подключение модеров) */}
      {showModsModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-md w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowModsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Подключить модераторов вручную</span>
            </h3>

            <div>
              <label className="text-[11px] text-slate-300 font-bold block mb-1">
                Должность / Название роли:
              </label>
              <input
                type="text"
                value={modCustomTitle}
                onChange={(e) => setModCustomTitle(e.target.value)}
                placeholder="Например: Модератор чата"
                className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sampleContactsForMods.map((contact) => {
                const isMod = community.moderators.some((m) => m.userId === contact.userId);

                return (
                  <div
                    key={contact.userId}
                    className="p-2.5 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={contact.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-white">{contact.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">@{contact.username}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddModerator(contact)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isMod
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isMod ? 'Убрать' : '+ Назначить'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TAB EDITOR MODAL (Редактор вкладок: порядок и вкл/выкл) */}
      {showTabEditorModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-md w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowTabEditorModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Редактор вкладок сообщества</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Вы можете настроить отображение вкладок (Главная, Посты, Клип, Видео, События) и изменить их порядок.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {editableTabs.map((tab, idx) => (
                <div key={tab.id} className="p-3 rounded-xl bg-[#1e2a38] border border-[#283748] flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tab.enabled}
                      onChange={() => handleToggleTabEnabled(tab.id)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-xs font-bold text-white">{tab.name}</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveTab(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded bg-[#17212b] hover:bg-[#283748] text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveTab(idx, 'down')}
                      disabled={idx === editableTabs.length - 1}
                      className="p-1 rounded bg-[#17212b] hover:bg-[#283748] text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveTabsConfig}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition shadow-lg cursor-pointer"
            >
              Сохранить порядок и отображение
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: FOLDER CREATION MODAL (Создать папку для клипов / видео) */}
      {showFolderModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-sm w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowFolderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-400" />
              <span>Создать папку для {folderTargetType === 'clips' ? 'клипов' : 'видео'}</span>
            </h3>

            <input
              type="text"
              placeholder="Название папки (например: Лучшее, Анонсы)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-xl border border-[#283748] outline-none focus:border-purple-400 transition"
            />

            <button
              onClick={handleCreateFolderSubmit}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
            >
              + Создать папку
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: EVENT CREATION MODAL (Добавить событие) */}
      {showEventModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#283748] rounded-3xl p-5 max-w-sm w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowEventModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Добавить событие сообщества</span>
            </h3>

            <input
              type="text"
              placeholder="Название события или онлайн-эфира..."
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-xl border border-[#283748] outline-none focus:border-emerald-400 transition"
            />

            <input
              type="text"
              placeholder="Дата и время (например: Завтра в 19:00)..."
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-xl border border-[#283748] outline-none focus:border-emerald-400 transition"
            />

            <textarea
              placeholder="Краткое описание события..."
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              rows={2}
              className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-xl border border-[#283748] outline-none focus:border-emerald-400 transition"
            />

            <button
              onClick={handleCreateEventSubmit}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
            >
              + Создать событие
            </button>
          </div>
        </div>
      )}

      {/* MODAL 7: FULLSCREEN PHOTO / VIDEO LIGHTBOX (Просмотр фото, аватара, баннера и видео полностью) */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setFullscreenMedia(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between px-4 py-3 bg-[#17212b]/90 border border-[#283748] rounded-2xl mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs sm:text-sm font-bold text-white truncate pr-4">
              {fullscreenMedia.title || 'Просмотр медиа'}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  downloadMediaFile(
                    fullscreenMedia.url,
                    `aurachat_${Date.now()}.${fullscreenMedia.type === 'video' ? 'mp4' : 'jpg'}`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать</span>
              </button>
              <button
                type="button"
                onClick={() => setFullscreenMedia(null)}
                className="p-1.5 rounded-xl bg-[#242f3d] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-[#283748] transition cursor-pointer"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Container */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenMedia.type === 'video' ? (
              <video
                src={fullscreenMedia.url}
                controls
                playsInline
                className="max-w-full max-h-[82vh] rounded-2xl bg-black shadow-2xl"
              />
            ) : (
              <img
                src={fullscreenMedia.url}
                alt={fullscreenMedia.title || ''}
                className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none"
              />
            )}
          </div>
        </div>
      )}

      {/* FULL CUSTOM VK-STYLE VIDEO PLAYER (AuraVideoPlayer) */}
      {activePlayingVideo && (
        <AuraVideoPlayer
          video={activePlayingVideo}
          onClose={() => setActivePlayingVideo(null)}
          onSaveWatchPosition={(videoId, posSec) => {
            saveVideoWatchPosition(videoId, currentUser.id, posSec);
          }}
          initialWatchPositionSec={savedWatchPositionSec}
          onEditVideo={(vid) => handleOpenEditVideo(vid)}
        />
      )}

      {/* MODAL 8: МАСТЕР ЗАГРУЗКИ ВИДЕО В СТИЛЕ VK ВИДЕО (Без съезжания и обрезки сверху/снизу) */}
      {showUploadVideoModal && (
        <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#222222] border border-[#2e2e2e] rounded-2xl max-w-lg w-full max-h-[86vh] flex flex-col overflow-hidden text-[#e1e3e6] shadow-2xl">
            
            {/* Fixed Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#2e2e2e] flex items-center justify-between shrink-0 bg-[#222222]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0077FF]/15 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-[#0077FF]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    Загрузка видео в «{community.title}»
                  </h3>
                  <p className="text-[11px] text-[#939393] truncate">
                    Добавление видеозаписи и настройка обложки
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadVideoModal(false)}
                className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fixed Stepper Bar (Никогда не обрезается сверху) */}
            <div className="px-4 sm:px-5 py-2.5 bg-[#19191a] border-b border-[#2e2e2e] grid grid-cols-4 gap-1.5 shrink-0">
              <div className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap truncate ${
                uploadStep === 1 ? 'bg-[#0077FF] text-white' : uploadStep > 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#222222] text-[#828282]'
              }`}>
                1. Файл
              </div>
              <div className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap truncate ${
                uploadStep === 2 ? 'bg-[#0077FF] text-white' : uploadStep > 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#222222] text-[#828282]'
              }`}>
                2. Данные
              </div>
              <div className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap truncate ${
                uploadStep === 3 ? 'bg-[#0077FF] text-white' : uploadStep > 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#222222] text-[#828282]'
              }`}>
                3. Проверка
              </div>
              <div className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center whitespace-nowrap truncate ${
                uploadStep === 4 ? 'bg-emerald-600 text-white' : 'bg-[#222222] text-[#828282]'
              }`}>
                4. Готово
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
              {/* STEP 1: ЗАГРУЗИТЬ ФАЙЛ И ОБЛОЖКУ */}
              {uploadStep === 1 && (
                <div className="space-y-3.5">
                  <div className="p-4 border border-dashed border-[#3a3b3c] hover:border-[#0077FF] rounded-xl bg-[#19191a] text-center space-y-2.5 transition">
                    <Upload className="w-8 h-8 text-[#0077FF] mx-auto" />
                    <div>
                      <span className="text-xs font-bold text-white block">Выберите видеофайл с устройства</span>
                      <span className="text-[11px] text-[#828282]">Поддерживаются форматы MP4, MOV, WEBM</span>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Выбрать файл</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUploadForVideo(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-[#939393] font-semibold block">Или прямая ссылка на видео (URL):</label>
                    <input
                      type="text"
                      value={uploadMediaUrl}
                      onChange={(e) => setUploadMediaUrl(e.target.value)}
                      placeholder="https://.../video.mp4"
                      className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                    />
                  </div>

                  {/* Установка обложки прямо при загрузке */}
                  <div className="space-y-2 pt-1 border-t border-[#2e2e2e]">
                    <label className="text-[11px] text-[#939393] font-semibold block">Обложка видео (необязательно):</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-white cursor-pointer flex items-center gap-1.5 transition">
                        <ImageIcon className="w-3.5 h-3.5 text-[#71aaeb]" />
                        <span>Загрузить обложку</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUploadForVideo(e, true)}
                          className="hidden"
                        />
                      </label>

                      {uploadMediaUrl && (
                        <button
                          type="button"
                          onClick={() => handleCaptureFrameFromVideo(uploadMediaUrl, (dataUrl) => setUploadCoverUrl(dataUrl))}
                          className="px-3 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#71aaeb] cursor-pointer flex items-center gap-1.5 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Сделать кадр из видео</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={uploadCoverUrl}
                      onChange={(e) => setUploadCoverUrl(e.target.value)}
                      placeholder="Или вставьте ссылку на изображение обложки..."
                      className="w-full bg-[#19191a] text-xs text-white p-2 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                    />

                    {uploadCoverUrl && (
                      <div className="flex items-center gap-3 p-2 bg-[#19191a] rounded-lg border border-[#2e2e2e]">
                        <img src={uploadCoverUrl} alt="Обложка" className="w-16 h-10 object-cover rounded border border-[#3a3b3c] shrink-0" />
                        <span className="text-xs text-emerald-400 font-medium truncate flex-1">✓ Обложка выбрана</span>
                        <button
                          type="button"
                          onClick={() => setUploadCoverUrl('')}
                          className="px-2 py-1 rounded bg-[#2c2d2e] hover:bg-rose-500/20 text-xs text-rose-400 cursor-pointer"
                        >
                          Сбросить
                        </button>
                      </div>
                    )}
                  </div>

                  {uploadMediaUrl && (
                    <div className="p-2.5 bg-[#19191a] rounded-lg border border-[#2e2e2e] flex items-center gap-3">
                      <video src={uploadMediaUrl} className="w-16 h-10 rounded object-cover bg-black shrink-0" />
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-semibold text-emerald-400 block truncate">✓ Видеофайл готов к загрузке</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: НАЗВАНИЕ, ПЛЕЙЛИСТ, ОБЛОЖКА И ДОСТУП */}
              {uploadStep === 2 && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] text-[#939393] font-semibold block mb-1">Название видео *</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Введите название видеозаписи..."
                      className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#939393] font-semibold block mb-1">Описание</label>
                    <textarea
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      rows={2}
                      placeholder="Добавьте описание к видео..."
                      className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#939393] font-semibold block mb-1">Плейлист</label>
                      <input
                        type="text"
                        value={uploadPlaylist}
                        onChange={(e) => setUploadPlaylist(e.target.value)}
                        placeholder="Общие"
                        className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#939393] font-semibold block mb-1">Тематика</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none"
                      >
                        <option value="Развлечения">Развлечения</option>
                        <option value="Обучение">Обучение</option>
                        <option value="Технологии">Технологии</option>
                        <option value="Музыка">Музыка</option>
                        <option value="Игры">Игры</option>
                        <option value="Блоги">Блоги</option>
                      </select>
                    </div>
                  </div>

                  {/* Кому доступно видео (Открытый / По ссылке / Закрытый) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#939393] font-semibold block">Кому доступно видео:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadPrivacy('public')}
                        className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                          uploadPrivacy === 'public'
                            ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                            : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Открытый</span>
                        </div>
                        <span className="text-[10px] text-[#828282] block mt-0.5">Видно всем</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadPrivacy('unlisted')}
                        className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                          uploadPrivacy === 'unlisted'
                            ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                            : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>По ссылке</span>
                        </div>
                        <span className="text-[10px] text-[#828282] block mt-0.5">У кого есть ссылка</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUploadPrivacy('private')}
                        className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                          uploadPrivacy === 'private'
                            ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                            : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Закрытый</span>
                        </div>
                        <span className="text-[10px] text-[#828282] block mt-0.5">Только автору</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ПРОВЕРКА */}
              {uploadStep === 3 && (
                <div className="p-4 rounded-xl bg-[#19191a] border border-[#2e2e2e] space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#0077FF]/15 text-[#0077FF] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Проверка видеозаписи</h4>
                    <p className="text-xs text-[#939393]">Проверка совместимости потока и метаданных</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#71aaeb]">Готовность</span>
                      <span className="text-white font-mono tabular-nums">{aiScanProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0077FF] transition-all duration-300"
                        style={{ width: `${aiScanProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#141414] rounded-lg text-[11px] font-mono text-left text-[#939393] space-y-1 border border-[#2e2e2e]">
                    {aiScanLogs.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: ОПУБЛИКОВАНО */}
              {uploadStep === 4 && (
                <div className="space-y-3 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Видеозапись опубликована</h3>
                    <p className="text-xs text-[#939393]">«{uploadTitle || 'Видеозапись'}» добавлена в сообщество</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-[#2e2e2e] bg-[#19191a] flex items-center justify-between gap-2 shrink-0">
              {uploadStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowUploadVideoModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={!uploadMediaUrl.trim()}
                    onClick={() => setUploadStep(2)}
                    className="px-5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    Далее
                  </button>
                </>
              )}

              {uploadStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setUploadStep(1)}
                    className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={!uploadTitle.trim()}
                    onClick={() => {
                      setUploadStep(3);
                      handleStartAiScan();
                    }}
                    className="px-5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    Продолжить
                  </button>
                </>
              )}

              {uploadStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setUploadStep(2)}
                    className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={aiScanProgress < 100}
                    onClick={handleUploadVideoFormSubmit}
                    className="px-5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    Опубликовать видео
                  </button>
                </>
              )}

              {uploadStep === 4 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowUploadVideoModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-semibold text-[#e1e3e6] cursor-pointer"
                  >
                    Закрыть
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadVideoModal(false);
                      if (communityVideos.length > 0) {
                        handleOpenVideoPlayer(communityVideos[0]);
                      }
                    }}
                    className="px-5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold cursor-pointer"
                  >
                    Смотреть видео
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* РЕДАКТИРОВАНИЕ ВИДЕОЗАПИСИ В СТИЛЕ VK ВИДЕО (Название, Плейлист, Обложка, Видимость: Открытый/Закрытый/По ссылке, Удалить) */}
      {editingVideo && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setEditingVideo(null)}
        >
          <div
            className="bg-[#222222] border border-[#2e2e2e] rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden text-[#e1e3e6] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#2e2e2e] flex items-center justify-between shrink-0 bg-[#222222]">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0077FF]" />
                <span>Редактирование видеозаписи</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin">
              {/* 1. Обложка видео (Превью + Загрузить свою + Кадр из видео + Готовые) */}
              <div className="space-y-2">
                <label className="text-xs text-[#939393] font-semibold block">Обложка видеозаписи</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-[#19191a] p-3 rounded-xl border border-[#2e2e2e]">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[#2e2e2e]">
                    {videoEditCoverUrl ? (
                      <img src={videoEditCoverUrl} alt="Обложка" className="w-full h-full object-cover" />
                    ) : (
                      <video src={editingVideo.mediaUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-medium">
                      {videoEditCoverUrl ? 'Своя обложка' : 'Автокадр'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="w-full px-3 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>Загрузить обложку</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCoverFileSelect(e, (dataUrl) => setVideoEditCoverUrl(dataUrl))}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleCaptureFrameFromVideo(editingVideo.mediaUrl, (dataUrl) => setVideoEditCoverUrl(dataUrl))}
                      className="w-full px-3 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#71aaeb] shrink-0" />
                      <span>Кадр из видео</span>
                    </button>

                    {videoEditCoverUrl && (
                      <button
                        type="button"
                        onClick={() => setVideoEditCoverUrl('')}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-rose-500/20 text-rose-400 text-xs font-medium cursor-pointer transition"
                      >
                        Сбросить обложку
                      </button>
                    )}
                  </div>
                </div>

                {/* Поле ссылки на обложку + Быстрые пресеты обложек */}
                <input
                  type="text"
                  value={videoEditCoverUrl}
                  onChange={(e) => setVideoEditCoverUrl(e.target.value)}
                  placeholder="Или вставьте прямую ссылку (URL) на обложку..."
                  className="w-full bg-[#19191a] text-xs text-white p-2 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                />
              </div>

              {/* 2. Название видео */}
              <div>
                <label className="text-xs text-[#939393] font-semibold block mb-1">Название видео *</label>
                <input
                  type="text"
                  value={videoEditTitle}
                  onChange={(e) => setVideoEditTitle(e.target.value)}
                  placeholder="Введите название видео..."
                  className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                />
              </div>

              {/* 3. Описание */}
              <div>
                <label className="text-xs text-[#939393] font-semibold block mb-1">Описание</label>
                <textarea
                  value={videoEditDescription}
                  onChange={(e) => setVideoEditDescription(e.target.value)}
                  rows={2}
                  placeholder="Описание видеоролика..."
                  className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF] resize-none"
                />
              </div>

              {/* 4. Плейлист (выбор существующего или ввод нового) */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#939393] font-semibold block">Плейлист</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from(new Set(['Общие', 'Музыка', 'Обучение', 'Влоги', 'Игры', ...communityVideos.map((v) => v.playlist || 'Общие')])).map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => setVideoEditPlaylist(pl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                        videoEditPlaylist === pl
                          ? 'bg-[#0077FF] text-white'
                          : 'bg-[#19191a] border border-[#2e2e2e] text-[#939393] hover:text-white'
                      }`}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={videoEditPlaylist}
                  onChange={(e) => setVideoEditPlaylist(e.target.value)}
                  placeholder="Или введите название нового плейлиста..."
                  className="w-full bg-[#19191a] text-xs text-white p-2.5 rounded-lg border border-[#2e2e2e] outline-none focus:border-[#0077FF]"
                />
              </div>

              {/* 5. Ограничение видимости видео (Открытый / По ссылке / Закрытый) */}
              <div className="space-y-2">
                <label className="text-xs text-[#939393] font-semibold block">Кому доступно это видео (видимость)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoEditPrivacy('public')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      videoEditPrivacy === 'public'
                        ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                        : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Открытый</span>
                    </div>
                    <span className="text-[10px] text-[#828282] block mt-0.5">Видно всем в сообществе</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoEditPrivacy('unlisted')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      videoEditPrivacy === 'unlisted'
                        ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                        : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Link2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>По ссылке</span>
                    </div>
                    <span className="text-[10px] text-[#828282] block mt-0.5">Только тем, у кого ссылка</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoEditPrivacy('private')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      videoEditPrivacy === 'private'
                        ? 'bg-[#0077FF]/15 border-[#0077FF] text-white'
                        : 'bg-[#19191a] border-[#2e2e2e] text-[#939393] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Закрытый</span>
                    </div>
                    <span className="text-[10px] text-[#828282] block mt-0.5">Видно только мне</span>
                  </button>
                </div>

                {videoEditPrivacy === 'unlisted' && (
                  <div className="p-2.5 rounded-lg bg-[#19191a] border border-[#2e2e2e] flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#71aaeb] truncate">
                      {`https://aurachat.app/video/${editingVideo.id}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://aurachat.app/video/${editingVideo.id}`);
                        setIsVideoLinkCopied(true);
                        playReactionSound();
                        setTimeout(() => setIsVideoLinkCopied(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-[#0077FF] hover:bg-[#0066DD] text-white text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      {isVideoLinkCopied ? 'Скопировано!' : 'Копировать ссылку'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Delete & Save */}
            <div className="px-4 sm:px-5 py-3 border-t border-[#2e2e2e] bg-[#19191a] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteSingleVideo(editingVideo.id)}
                className="px-3.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Удалить видео</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs font-semibold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedVideo}
                  className="px-5 py-2 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

