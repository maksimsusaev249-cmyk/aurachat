export type TabType = 'architecture' | 'database' | 'backend' | 'vanilla-client' | 'live-demo';

export interface AnsweringMachineSettings {
  enabled: boolean;
  delaySec: number; // 0, 15, 30, 60, 300
  mode: 'tts' | 'recorded' | 'preset';
  ttsVoice: 'ru_female_soft' | 'ru_female_official' | 'ru_male';
  ttsText: string;
  recordedAudioUrl?: string;
  recordedDurationSec?: number;
  presetMessage: string;
  scheduleType: '24/7' | 'working_hours' | 'night_only' | 'custom';
  nightModeAuto: boolean;
  exceptContactIds: string[];
}

export interface AnsweringMachineLog {
  id: string;
  callerName: string;
  callerAvatar: string;
  deliveredType: 'voicemail' | 'tts' | 'preset';
  contentPreview: string;
  audioUrl?: string;
  timestamp: string;
}

export interface UserSettings {
  theme?: 'dark' | 'light';
  language?: 'ru' | 'en' | 'kk' | 'uz';
  textSize?: 'small' | 'normal' | 'large';
  accentColor?: string;
  answeringMachine?: AnsweringMachineSettings;
}

export interface User {
  id: string;
  phone?: string;
  email?: string;
  password?: string;
  pinCode?: string;
  hasPin?: boolean;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  isPrivate?: boolean;
  hideContacts?: boolean;
  hideOnlineStatus?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  verified?: boolean;
  isUltraMember?: boolean;
  usernameLastChanged?: string;
  settings?: UserSettings;
}

export type ChatType = 'direct' | 'group' | 'channel' | 'saved' | 'community';

export interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  includedTypes?: ChatType[];
  chatIds: string[];
  isAll?: boolean;
}

export interface ChatTopic {
  id: string;
  chatId: string;
  title: string;
  icon: string;
  unreadCount?: number;
}

export interface AdminPermissions {
  canChangeInfo: boolean;
  canPostMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
  canManageTopics: boolean;
  canAddAdmins: boolean;
}

export interface ChatMember {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  role: 'owner' | 'admin' | 'member';
  customTitle?: string;
  permissions?: AdminPermissions;
  promotedBy?: string;
}

export interface BannedMember {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bannedBy: string;
  bannedAt: string;
  reason?: string;
}

export interface AdminLogEntry {
  id: string;
  actorName: string;
  action: string;
  timestamp: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  username: string;
  requestedAt: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  description?: string;
  avatarUrl: string;
  isPrivate: boolean;
  inviteCode?: string;
  membersCount: number;
  topics?: ChatTopic[];
  members: ChatMember[];
  bannedMembers?: BannedMember[];
  adminLog?: AdminLogEntry[];
  signMessages?: boolean;
  allowReactions?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  requiresApproval?: boolean;
  joinRequests?: JoinRequest[];
}

export type MessageType = 'text' | 'image' | 'voice' | 'video_note' | 'file' | 'audio';

export interface Message {
  id: string;
  chatId: string;
  topicId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  authorSignature?: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  durationSec?: number;
  mediaMeta?: {
    durationSec?: number;
    sizeBytes?: number;
    fileName?: string;
    waveform?: number[];
    title?: string;
    artist?: string;
    trimmedStartSec?: number;
    trimmedLengthSec?: number;
    mediaUrl?: string;
    replyTo?: { id: string; senderName: string; content: string };
  };
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; count: number; userReacted?: boolean }[];
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string; // 24h expiry
  viewsCount: number;
  isViewed?: boolean;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'gif';
  replies?: PostComment[];
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'post' | 'reel';
  mediaUrl: string;
  images?: string[];
  linkUrl?: string;
  linkTitle?: string;
  music?: {
    id: string;
    title: string;
    artist: string;
    duration: string;
    genre?: string;
  };
  isUltraLimit?: boolean;
  mediaType: 'image' | 'video' | 'text';
  caption: string;
  likesCount: number;
  isLiked?: boolean;
  viewsCount?: number;
  commentsCount: number;
  comments: PostComment[];
  createdAt: string;
  quality?: string;
  speed?: string;
  filter?: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9' | '3:4' | 'full';
  privacy?: 'everyone' | 'subscribers' | 'friends' | 'only_me';
  allowComments?: boolean;
  allowDuet?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
  isReposted?: boolean;
  repostsCount?: number;
  communityId?: string;
  communityTitle?: string;
  attachedFile?: { name: string; url: string; size?: string };
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    totalVotes: number;
    userVotedOption?: number;
  };
}

export interface ProfileVisitor {
  id: string;
  userId: string;
  userName: string;
  username: string;
  avatarUrl: string;
  visitedAt: string;
  isOnline?: boolean;
  viewCount: number;
}

export interface CommunityGif {
  id: string;
  title: string;
  url: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: string;
  usesCount: number;
}

export interface CallRecord {
  id: string;
  contactName: string;
  contactUsername?: string;
  avatarUrl: string;
  direction: 'outgoing' | 'incoming';
  status: 'completed' | 'missed' | 'declined';
  isVideo: boolean;
  durationSec: number;
  timestamp: string;
  dateStr?: string;
  isMissed: boolean; // true = Красный (пропустил звонок); false = Зелёный (совершил звонок)
}

export interface CommunityModerator {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  role: 'owner' | 'moderator';
  customTitle?: string;
  addedAt: string;
}

export interface CommunityTabConfig {
  id: string; // 'home' | 'posts' | 'clips' | 'videos' | 'events'
  name: string;
  enabled: boolean;
}

export interface CommunityFolder {
  id: string;
  name: string;
  type: 'clips' | 'videos';
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  attendeesCount: number;
  isAttending?: boolean;
}

export interface Community {
  id: string;
  title: string;
  description: string;
  avatarUrl: string;
  bannerUrl?: string;
  backgroundUrl?: string; // Фон страницы сообщества (доступно создателю и модераторам)
  ownerId: string;
  ownerName: string;
  ownerUsername?: string;
  ownerAvatar: string;
  isPrivate: boolean; // true = приватное по ссылке, false = публичное по ссылке и в поиске
  inviteCode: string;
  subscribersCount: number;
  subscribersUserIds: string[];
  attachedChannelId?: string;
  attachedChannelTitle?: string;
  attachedGroupId?: string;
  attachedGroupTitle?: string;
  moderators: CommunityModerator[];
  postsCount: number;
  createdAt: string;
  tabsConfig?: CommunityTabConfig[];
  folders?: CommunityFolder[];
  events?: CommunityEvent[];
  hideAdmins?: boolean; // Скрыть создателя и модераторов в профиле сообщества
  joinRequests?: JoinRequest[]; // Заявки на вступление в закрытое сообщество
}


