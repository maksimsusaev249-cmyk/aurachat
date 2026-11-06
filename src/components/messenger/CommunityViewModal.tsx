import React, { useState } from 'react';
import { Community, CommunityModerator, CommunityTabConfig, CommunityFolder, CommunityEvent, Post, PostComment, User, Chat } from '../../types';
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
  Settings
} from 'lucide-react';
import { playReactionSound, playSentSound } from '../../utils/audioUtils';
import { downloadMediaFile } from '../../utils/downloadUtils';
import { formatSmartTime } from '../../utils/dateUtils';
import { ViewTargetUser } from './OtherUserProfileModal';

interface CommunityViewModalProps {
  community: Community | null;
  currentUser: User;
  chats?: Chat[];
  posts?: Post[];
  onClose: () => void;
  onUpdateCommunity: (updated: Community) => void;
  onPublishCommunityPost: (communityId: string, postData: Partial<Post> & { caption: string }) => void;
  onSelectChat?: (chat: Chat) => void;
  onOpenUserProfile?: (user: ViewTargetUser) => void;
  onMessageUser?: (user: ViewTargetUser) => void;
  onOpenCommunityChat?: (community: Community) => void;
  onToggleLikePost?: (postId: string) => void;
  onAddComment?: (postId: string, comment: PostComment) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
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
  onDeleteComment
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showModsModal, setShowModsModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);

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

  // New post form states with rich attachments
  const [postCaption, setPostCaption] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postAttachmentType, setPostAttachmentType] = useState<'none' | 'image' | 'file' | 'music' | 'poll'>('none');
  const [postAttachedFile, setPostAttachedFile] = useState<{ name: string; url: string; size?: string } | null>(null);
  const [postMusic, setPostMusic] = useState<{ id: string; title: string; artist: string; duration: string; genre?: string } | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [pollOption3, setPollOption3] = useState('');

  // Add Moderator & Post Author Mode form states
  const [modCustomTitle, setModCustomTitle] = useState('Модератор');
  const [postAuthorMode, setPostAuthorMode] = useState<'community' | 'user'>('community');

  // Community Tabs state: 'posts' | 'clips' | 'videos' | 'events' | 'home'
  const [activeTab, setActiveTab] = useState<string>('posts');

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

  const isOwner = community.ownerId === currentUser.id;
  const isSubscribed = community.subscribersUserIds.includes(currentUser.id);
  const isModerator = community.moderators.some((m) => m.userId === currentUser.id);
  const canManage = isOwner || isModerator;
  const pendingRequests = community.joinRequests || [];
  const hasPendingRequest = pendingRequests.some((r) => r.userId === currentUser.id);
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
    if (isSubscribed) {
      const updatedSubscribers = community.subscribersUserIds.filter((id) => id !== currentUser.id);
      onUpdateCommunity({
        ...community,
        subscribersUserIds: updatedSubscribers,
        subscribersCount: updatedSubscribers.length
      });
      return;
    }

    // Если сообщество закрытое и пользователь не владелец/модератор — отправляем или отменяем заявку
    if (community.isPrivate && !canManage) {
      if (hasPendingRequest) {
        onUpdateCommunity({
          ...community,
          joinRequests: pendingRequests.filter((r) => r.userId !== currentUser.id)
        });
      } else {
        onUpdateCommunity({
          ...community,
          joinRequests: [
            ...pendingRequests,
            {
              id: 'jreq_' + Date.now(),
              userId: currentUser.id,
              userName: currentUser.displayName,
              userAvatar: currentUser.avatarUrl,
              username: currentUser.username,
              requestedAt: 'Только что'
            }
          ]
        });
      }
      return;
    }

    const updatedSubscribers = [...community.subscribersUserIds, currentUser.id];
    onUpdateCommunity({
      ...community,
      subscribersUserIds: updatedSubscribers,
      subscribersCount: updatedSubscribers.length
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
      subscribersCount: updatedSubscribers.length
    });
  };

  const handleDeclineJoinRequest = (targetUserId: string) => {
    playReactionSound();
    onUpdateCommunity({
      ...community,
      joinRequests: pendingRequests.filter((r) => r.userId !== targetUserId)
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
    if (!postCaption.trim() && !pollQuestion.trim()) return;
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

    onPublishCommunityPost(community.id, {
      caption: postCaption.trim() || pollQuestion.trim(),
      mediaUrl: postMediaUrl.trim() || undefined,
      attachedFile: postAttachedFile ? { name: postAttachedFile.name, size: postAttachedFile.size || '1.2 MB', url: postAttachedFile.url } : undefined,
      music: postMusic || undefined,
      poll: finalPoll,
      type: 'post',
      userName: postAuthorMode === 'community' ? community.title : currentUser.displayName,
      userAvatar: postAuthorMode === 'community' ? community.avatarUrl : currentUser.avatarUrl,
      userId: postAuthorMode === 'community' ? community.id : currentUser.id
    });

    setPostCaption('');
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

  return (
    <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col text-[#e1e3e6] w-full h-full select-none overflow-hidden">
      <div className="bg-[#141414] w-full h-full flex flex-col relative overflow-hidden">
        
        {/* VK Top Navigation Bar */}
        <div className="px-4 py-2.5 bg-[#222222] border-b border-[#2e2e2e] flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg hover:bg-[#2c2d2e] text-[#e1e3e6] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-[#71aaeb]" />
              <span>Назад</span>
            </button>

            <div className="h-4 w-[1px] bg-[#2e2e2e] hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <img
                src={community.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0 hidden sm:block"
              />
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {community.title}
              </span>
              <span className="text-[11px] text-[#828282] hidden md:inline">
                · {community.isPrivate ? 'Закрытое сообщество' : 'Открытое сообщество'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#e1e3e6] flex items-center gap-1.5 cursor-pointer"
              title="Скопировать ссылку на сообщество"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#71aaeb]" />}
              <span className="hidden sm:inline">{isCopied ? 'Скопировано' : 'Поделиться'}</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-xs font-medium text-[#e1e3e6] flex items-center gap-1.5 cursor-pointer"
                title="Управление сообществом"
              >
                <Settings className="w-3.5 h-3.5 text-[#71aaeb]" />
                <span className="hidden sm:inline">Управление</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
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
                    <span>Изменить обложку</span>
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

                  {/* Right: VK Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <button
                      onClick={handleToggleSubscribe}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSubscribed
                          ? 'bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb]'
                          : hasPendingRequest
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-[#0077FF] hover:bg-[#0066DD] text-white'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Вы подписаны</span>
                        </>
                      ) : community.isPrivate && !canManage ? (
                        hasPendingRequest ? (
                          <>
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>Заявка отправлена (Отменить)</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Оставить заявку</span>
                          </>
                        )
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Подписаться</span>
                        </>
                      )}
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowNewPostModal(true)}
                        className="px-3.5 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#71aaeb]" />
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
                      className="px-3.5 py-2 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#e1e3e6] text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      title={`Перейти в чат сообщества (диалог с владельцем: ${ownerDisplayName})`}
                    >
                      <MessageSquare className="w-4 h-4 text-[#71aaeb]" />
                      <span>Сообщение</span>
                    </button>
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
            {/* БЛОК УПРАВЛЕНИЯ ЗАЯВКАМИ ДЛЯ ВЛАДЕЛЬЦА И МОДЕРАТОРА               */}
            {/* ================================================================= */}
            {canManage && pendingRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#222222] border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white">
                        Заявки на вступление в сообщество ({pendingRequests.length})
                      </h3>
                      <p className="text-[11px] text-[#939393]">
                        Подтвердите или отклоните заявки пользователей как владелец или модератор
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-[#19191a] border border-[#2e2e2e] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={req.userAvatar}
                          alt={req.userName}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {req.userName}
                          </div>
                          <div className="text-[11px] text-[#828282] truncate">
                            @{req.username} · Подал(а) заявку: {req.requestedAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveJoinRequest(req.userId)}
                          className="px-3 py-1.5 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Подтвердить</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineJoinRequest(req.userId)}
                          className="px-3 py-1.5 rounded-lg bg-[#2c2d2e] hover:bg-rose-600/20 text-[#939393] hover:text-rose-400 text-xs font-semibold cursor-pointer"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* ЕСЛИ СООБЩЕСТВО ЗАКРЫТОЕ И ПОЛЬЗОВАТЕЛЬ НЕ ПОДПИСАН (ЗАКРЫТЫЙ ПРОФИЛЬ) */}
            {/* ================================================================= */}
            {isPrivateLocked ? (
              <div className="p-6 sm:p-10 rounded-2xl bg-[#222222] border border-[#2e2e2e] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Закрытый профиль сообщества
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#939393] leading-relaxed">
                    Это закрытое сообщество. Доступ к записям, фотографиям и материалам открывается только после подтверждения вашей заявки владельцем ({ownerDisplayName}) или модератором.
                  </p>
                </div>

                {!hasPendingRequest ? (
                  <div className="pt-2 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSubscribe}
                      className="px-6 py-2.5 rounded-xl bg-[#0077FF] hover:bg-[#0066DD] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Оставить заявку</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 max-w-md mx-auto space-y-3">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                      ⏳ <strong>Заявка отправлена!</strong> Ожидайте подтверждения от владельца сообщества ({ownerDisplayName}) или модератора.
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveJoinRequest(currentUser.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        title="Подтвердить заявку от лица владельца или модератора"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Подтвердить заявку (Владелец / Модератор)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleSubscribe}
                        className="px-4 py-2 rounded-xl bg-[#2c2d2e] hover:bg-[#363738] text-[#939393] hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Отменить заявку
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
            /* ================================================================= */
            /* VK 2-COLUMN BODY: СТЕНA СООБЩЕСТВА (СЛЕВА) + БЛОКИ ВК (СПРАВА)    */
            /* ================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* LEFT / MAIN COLUMN: БЫСТРАЯ ЗАПИСЬ + ВКЛАДКИ + СТЕНА */}
              <div className="lg:col-span-8 space-y-3.5 min-w-0">
                
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

                                {post.mediaUrl && (
                                  <div className="flex items-center gap-1.5 shrink-0">
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
                                  </div>
                                )}
                              </div>

                              {/* VK Post Text */}
                              {post.caption && (
                                <p className="text-[13px] sm:text-sm text-[#e1e3e6] whitespace-pre-wrap break-words leading-relaxed">
                                  {post.caption}
                                </p>
                              )}

                              {/* VK Post Media (Uncropped Full View) */}
                              {post.mediaUrl && (
                                <div className="rounded-xl overflow-hidden border border-[#2e2e2e] bg-[#141414] flex items-center justify-center">
                                  {post.mediaType === 'video' ? (
                                    <video
                                      src={post.mediaUrl}
                                      controls
                                      className="w-full max-h-[540px] object-contain"
                                    />
                                  ) : (
                                    <img
                                      src={post.mediaUrl}
                                      alt=""
                                      onClick={() =>
                                        setFullscreenMedia({
                                          url: post.mediaUrl,
                                          type: 'image',
                                          title: post.caption || community.title
                                        })
                                      }
                                      className="w-full max-h-[540px] object-contain cursor-zoom-in"
                                      title="Нажмите, чтобы открыть фото полностью"
                                    />
                                  )}
                                </div>
                              )}

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

                  {/* TAB CONTENT 2: КЛИПЫ */}
                  {activeTab === 'clips' && (
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setSelectedFolderId('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                              selectedFolderId === 'all'
                                ? 'bg-[#0077FF] text-white'
                                : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                            }`}
                          >
                            Все клипы
                          </button>

                          {(community.folders || [])
                            .filter((f) => f.type === 'clips')
                            .map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 ${
                                  selectedFolderId === folder.id
                                    ? 'bg-[#0077FF] text-white'
                                    : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                                }`}
                              >
                                <Folder className="w-3.5 h-3.5" />
                                <span>{folder.name}</span>
                              </button>
                            ))}
                        </div>

                        {canManage && (
                          <button
                            onClick={() => {
                              setFolderTargetType('clips');
                              setShowFolderModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ Плейлист</span>
                          </button>
                        )}
                      </div>

                      {communityPosts.filter((p) => p.mediaUrl).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {communityPosts
                            .filter((p) => p.mediaUrl)
                            .map((clip) => (
                              <div key={clip.id} className="p-3 rounded-xl bg-[#292929] border border-[#333334] space-y-2">
                                <div className="rounded-lg overflow-hidden bg-[#141414]">
                                  {clip.mediaType === 'video' ? (
                                    <video src={clip.mediaUrl} controls className="w-full max-h-80 object-contain" />
                                  ) : (
                                    <img
                                      src={clip.mediaUrl}
                                      alt=""
                                      onClick={() =>
                                        setFullscreenMedia({
                                          url: clip.mediaUrl,
                                          type: 'image',
                                          title: clip.caption
                                        })
                                      }
                                      className="w-full max-h-80 object-contain cursor-zoom-in"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-[#e1e3e6] truncate">{clip.caption}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullscreenMedia({
                                        url: clip.mediaUrl,
                                        type: clip.mediaType === 'video' ? 'video' : 'image',
                                        title: clip.caption
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#0077FF] text-white text-xs font-medium shrink-0 cursor-pointer"
                                  >
                                    Открыть
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <Film className="w-8 h-8 text-[#828282] mx-auto" />
                          <p className="text-xs sm:text-sm text-[#e1e3e6] font-medium">Клипы сообщества</p>
                          <p className="text-xs text-[#828282]">Здесь отображаются короткие вертикальные ролики и клипы.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT 3: ВИДЕО */}
                  {activeTab === 'videos' && (
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setSelectedFolderId('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                              selectedFolderId === 'all'
                                ? 'bg-[#0077FF] text-white'
                                : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                            }`}
                          >
                            Все видео
                          </button>

                          {(community.folders || [])
                            .filter((f) => f.type === 'videos')
                            .map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 ${
                                  selectedFolderId === folder.id
                                    ? 'bg-[#0077FF] text-white'
                                    : 'bg-[#2c2d2e] text-[#939393] hover:text-white'
                                }`}
                              >
                                <Folder className="w-3.5 h-3.5" />
                                <span>{folder.name}</span>
                              </button>
                            ))}
                        </div>

                        {canManage && (
                          <button
                            onClick={() => {
                              setFolderTargetType('videos');
                              setShowFolderModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#363738] text-[#71aaeb] text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ Плейлист</span>
                          </button>
                        )}
                      </div>

                      {communityPosts.filter((p) => p.mediaUrl).length > 0 ? (
                        <div className="space-y-3">
                          {communityPosts
                            .filter((p) => p.mediaUrl)
                            .map((vid) => (
                              <div key={vid.id} className="p-3.5 rounded-xl bg-[#292929] border border-[#333334] space-y-2">
                                <div className="rounded-lg overflow-hidden bg-[#141414]">
                                  {vid.mediaType === 'video' ? (
                                    <video src={vid.mediaUrl} controls className="w-full max-h-[500px] object-contain" />
                                  ) : (
                                    <img
                                      src={vid.mediaUrl}
                                      alt=""
                                      onClick={() =>
                                        setFullscreenMedia({
                                          url: vid.mediaUrl,
                                          type: 'image',
                                          title: vid.caption
                                        })
                                      }
                                      className="w-full max-h-[500px] object-contain cursor-zoom-in"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-[#e1e3e6]">{vid.caption}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullscreenMedia({
                                        url: vid.mediaUrl,
                                        type: vid.mediaType === 'video' ? 'video' : 'image',
                                        title: vid.caption
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#0077FF] text-white text-xs font-medium shrink-0 cursor-pointer"
                                  >
                                    На весь экран
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <Video className="w-8 h-8 text-[#828282] mx-auto" />
                          <p className="text-xs sm:text-sm text-[#e1e3e6] font-medium">Видеозаписи сообщества</p>
                          <p className="text-xs text-[#828282]">Добавляйте видеоролики и объединяйте их в тематические плейлисты.</p>
                        </div>
                      )}
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

              {/* RIGHT COLUMN: БОКОВАЯ КОЛОНКА В СТИЛЕ ВКОНТАКТЕ (Подписчики, Ссылки/Чаты, Контакты) */}
              <div className="lg:col-span-4 space-y-3.5 min-w-0">
                
                {/* VK Widget 1: Подписчики */}
                <div className="p-4 rounded-2xl bg-[#222222] border border-[#2e2e2e] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Подписчики</span>
                    <span className="text-xs text-[#939393]">{community.subscribersCount}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: ownerDisplayName, avatar: ownerAvatar },
                      ...sampleContactsForMods.map((c) => ({ name: c.displayName.split(' ')[0], avatar: c.avatarUrl }))
                    ]
                      .slice(0, 4)
                      .map((sub, i) => (
                        <div key={i} className="flex flex-col items-center text-center gap-1">
                          <img src={sub.avatar} alt="" className="w-11 h-11 rounded-full object-cover bg-[#2c2d2e]" />
                          <span className="text-[11px] text-[#e1e3e6] truncate w-full">{sub.name}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* VK Widget 2: Ссылки и беседы сообщества */}
                <div className="p-4 rounded-2xl bg-[#222222] border border-[#2e2e2e] space-y-2.5">
                  <span className="text-xs font-semibold text-white block">Ссылки и чаты</span>

                  <div className="p-2.5 rounded-xl bg-[#292929] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#939393]">Пригласительная ссылка</div>
                      <div className="text-xs text-[#71aaeb] font-mono truncate">
                        aurachat.app/c/{community.inviteCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-[#0077FF] hover:bg-[#0066DD] text-white text-[11px] font-medium cursor-pointer shrink-0"
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
                      className="w-full p-2.5 rounded-xl bg-[#292929] hover:bg-[#323233] flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#0077FF]/20 text-[#71aaeb] flex items-center justify-center shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {community.attachedChannelTitle || 'Канал сообщества'}
                          </div>
                          <div className="text-[11px] text-[#939393]">Перейти в канал</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#939393] shrink-0" />
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
                      className="w-full p-2.5 rounded-xl bg-[#292929] hover:bg-[#323233] flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#0077FF]/20 text-[#71aaeb] flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">
                            {community.attachedGroupTitle || 'Беседа сообщества'}
                          </div>
                          <div className="text-[11px] text-[#939393]">Открыть чат</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#939393] shrink-0" />
                    </button>
                  )}
                </div>

                {/* VK Widget 3: Контакты (Создатель и Модераторы) */}
                <div className="p-4 rounded-2xl bg-[#222222] border border-[#2e2e2e] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      Контакты ({1 + extraModerators.length})
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleHideAdmins}
                          className="text-[11px] text-[#71aaeb] hover:underline cursor-pointer"
                        >
                          {community.hideAdmins ? 'Показать' : 'Скрыть'}
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setShowModsModal(true)}
                            className="text-[11px] text-[#71aaeb] hover:underline cursor-pointer ml-1"
                          >
                            + Модер
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {community.hideAdmins && !canManage ? (
                    <div className="text-xs text-[#939393] flex items-center gap-2 py-1">
                      <EyeOff className="w-4 h-4 shrink-0" />
                      <span>Контакты скрыты администрацией</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Создатель */}
                      <div className="flex items-center justify-between gap-2">
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
                            <div className="text-xs font-medium text-white group-hover:text-[#71aaeb] truncate">
                              {ownerDisplayName}
                            </div>
                            <div className="text-[11px] text-[#939393] truncate">Создатель</div>
                          </div>
                        </div>

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
                          className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-xs text-[#71aaeb] hover:text-white font-medium cursor-pointer shrink-0"
                        >
                          Написать
                        </button>
                      </div>

                      {/* Модераторы */}
                      {extraModerators.map((m) => (
                        <div key={m.userId} className="flex items-center justify-between gap-2">
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
                              <div className="text-xs font-medium text-white group-hover:text-[#71aaeb] truncate">
                                {m.displayName}
                              </div>
                              <div className="text-[11px] text-[#939393] truncate">
                                {m.customTitle || 'Модератор'}
                              </div>
                            </div>
                          </div>

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
                            className="px-2.5 py-1 rounded-lg bg-[#2c2d2e] hover:bg-[#0077FF] text-xs text-[#71aaeb] hover:text-white font-medium cursor-pointer shrink-0"
                          >
                            Написать
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

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

            <textarea
              placeholder="Текст публикации или анонса для сообщества..."
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              rows={3}
              className="w-full bg-[#242f3d] text-xs text-white p-3 rounded-2xl border border-[#283748] outline-none focus:border-[#5288c1] transition"
            />

            {/* URL input fallback */}
            <input
              type="text"
              placeholder="Ссылка на медиа или фото (необязательно)..."
              value={postMediaUrl}
              onChange={(e) => setPostMediaUrl(e.target.value)}
              className="w-full bg-[#242f3d] text-xs text-white p-2.5 rounded-xl border border-[#283748] outline-none focus:border-[#5288c1] transition"
            />

            {/* Rich Attachment Toolbar: Фото, Видео, Файл, Музыка, Опрос */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-bold block">Прикрепить к посту:</span>
              <div className="grid grid-cols-5 gap-1.5 bg-[#1e2a38] p-1.5 rounded-2xl border border-[#283748]">
                {/* 1. Photo */}
                <label
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postAttachmentType === 'image' || postMediaUrl
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Фото</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) {
                            setPostMediaUrl(ev.target.result as string);
                            setPostAttachmentType('image');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {/* 2. Video */}
                <button
                  type="button"
                  onClick={() => setPostAttachmentType(postAttachmentType === 'image' ? 'none' : 'image')}
                  className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    postAttachmentType === 'image'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-[#17212b] text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <Video className="w-4 h-4 text-indigo-400" />
                  <span>Видео</span>
                </button>

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
                    if (postAttachmentType === 'music') {
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

            <button
              onClick={handlePublishPostSubmit}
              disabled={!postCaption.trim() && !pollQuestion.trim()}
              className="w-full py-3 rounded-2xl bg-[#5288c1] hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Опубликовать пост →
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
                autoPlay
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

    </div>
  );
};

