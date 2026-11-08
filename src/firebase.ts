import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, onSnapshot, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Chat, Message, Story, Post, Community, CallRecord, CommunityVideo, CommunityVideoComment } from './types';

const app = initializeApp(firebaseConfig);

// CRITICAL: firestoreDatabaseId is required by Firebase integration skill
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Quota Circuit Breaker state persisted in localStorage
const QUOTA_STORAGE_KEY = 'aurachat_firestore_quota_exceeded_timestamp';

function checkInitialQuota(): boolean {
  // We have a real built-in Shared Express Server (/api/platform-state & /api/events),
  // so platform synchronization is NEVER disabled or stuck in offline quota mode.
  return false;
}

let isQuotaExceeded = checkInitialQuota();
let isFirestoreBackendDisabled = true; // Disable direct Firestore writes to prevent quota errors; use Shared Server (/api/*) as primary real-time server
let quotaExceededListeners: ((exceeded: boolean) => void)[] = [];

// Immediately disconnect direct Firestore network to avoid background retry loops while using Shared Server
try {
  disableNetwork(db).catch(() => {});
} catch {}

// Intercept and suppress internal @firebase/firestore console logs for quota exhaustion
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.map((a) => (typeof a === 'string' ? a : String(a?.message || a || ''))).join(' ');
    if (
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('quota metric') ||
      msg.includes('Free daily write') ||
      msg.includes('overloading the backend') ||
      msg.includes('maximum backoff delay')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason ? String(event.reason?.message || event.reason) : '';
    if (
      reason.includes('resource-exhausted') ||
      reason.includes('Quota limit exceeded') ||
      reason.includes('quota metric') ||
      reason.includes('quota') ||
      reason.includes('Free daily write') ||
      reason.includes('overloading the backend')
    ) {
      try {
        event.preventDefault();
      } catch {}
      isFirestoreBackendDisabled = true;
    }
  });
}

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function subscribeToQuotaExceeded(callback: (exceeded: boolean) => void): () => void {
  quotaExceededListeners.push(callback);
  callback(isQuotaExceeded);
  return () => {
    quotaExceededListeners = quotaExceededListeners.filter((cb) => cb !== callback);
  };
}

export function setFirestoreQuotaExceeded(exceeded: boolean = true) {
  isFirestoreBackendDisabled = exceeded;
  try {
    if (exceeded) {
      disableNetwork(db).catch(() => {});
    }
  } catch {}
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errString = error instanceof Error ? error.message : String(error);

  if (
    errString.includes('resource-exhausted') ||
    errString.includes('Quota limit exceeded') ||
    errString.includes('quota metric') ||
    errString.includes('quota') ||
    errString.includes('Free daily write') ||
    errString.includes('overloading the backend')
  ) {
    setFirestoreQuotaExceeded(true);
    return null;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errString,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  return errInfo;
}

// Initial connection test
export async function testConnection() {
  if (isFirestoreBackendDisabled) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'test/connection');
  }
}

/**
 * Fetch all registered users from the Shared Server (/api/users)
 */
export async function fetchUsersFromSharedServer(query: string = ''): Promise<User[]> {
  try {
    const url = query
      ? `/api/users?q=${encodeURIComponent(query)}`
      : '/api/users';
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.users) ? data.users : [];
  } catch {
    return [];
  }
}

/**
 * 1. Google Authentication (Sign In with Popup)
 */
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;

  const username = fbUser.email 
    ? fbUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
    : `user_${fbUser.uid.slice(0, 6)}`;

  const mappedUser: User = {
    id: fbUser.uid,
    displayName: fbUser.displayName || 'Пользователь Google',
    username,
    email: fbUser.email || undefined,
    phone: fbUser.phoneNumber || undefined,
    avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}&backgroundColor=1e293b`,
    bio: 'AuraChat • Авторизован через Google',
    isOnline: true,
    lastSeen: 'в сети'
  };

  await syncAccountToCloud(mappedUser);
  return mappedUser;
}

/**
 * 2. Email & Password Sign In
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const fbUser = result.user;

  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const mappedUser: User = {
    id: fbUser.uid,
    displayName: fbUser.displayName || username,
    username,
    email: fbUser.email || email,
    avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}&backgroundColor=1e293b`,
    bio: 'AuraChat • Пользователь',
    isOnline: true,
    lastSeen: 'в сети'
  };

  await syncAccountToCloud(mappedUser);
  return mappedUser;
}

/**
 * 3. Email & Password Registration
 */
export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const fbUser = result.user;

  const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const finalName = displayName.trim() || username;

  try {
    await updateProfile(fbUser, {
      displayName: finalName
    });
  } catch {}

  const mappedUser: User = {
    id: fbUser.uid,
    displayName: finalName,
    username,
    email: fbUser.email || email,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}&backgroundColor=1e293b`,
    bio: 'Новый пользователь AuraChat',
    isOnline: true,
    lastSeen: 'в сети'
  };

  await syncAccountToCloud(mappedUser);
  return mappedUser;
}

/**
 * 4. Phone Recaptcha & SMS Verification
 */
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {}
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {}
  });
  return recaptchaVerifier;
}

export async function sendPhoneVerificationCode(phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<ConfirmationResult> {
  const verifier = setupRecaptcha(containerId);
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function verifyPhoneCodeAndSignIn(confirmationResult: ConfirmationResult, code: string): Promise<User> {
  const result = await confirmationResult.confirm(code);
  const fbUser = result.user;

  const phoneClean = fbUser.phoneNumber || 'phone_user';
  const username = `user_${phoneClean.replace(/[^0-9]/g, '').slice(-4)}`;

  const mappedUser: User = {
    id: fbUser.uid,
    displayName: fbUser.displayName || `Абонент ${phoneClean.slice(-4)}`,
    username,
    phone: phoneClean,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}&backgroundColor=1e293b`,
    bio: 'AuraChat • Вход по номеру телефона',
    isOnline: true,
    lastSeen: 'в сети'
  };

  await syncAccountToCloud(mappedUser);
  return mappedUser;
}

export async function resetPasswordWithEmail(email: string): Promise<boolean> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (err) {
    console.warn('Password reset notice:', err);
    return false;
  }
}

export async function logoutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {}
}

export interface CloudPlatformState {
  savedAccounts?: User[];
  userChatsMap?: Record<string, Chat[]>;
  globalCatalogChats?: Chat[];
  messagesMap?: Record<string, Message[]>;
  communities?: Community[];
  stories?: Story[];
  posts?: Post[];
  reels?: Post[];
  calls?: CallRecord[];
  callsMap?: Record<string, CallRecord[]>;
  followingMap?: Record<string, Record<string, boolean>>;
  deletedIds?: string[];
  updatedAt?: number;
  updatedBy?: string;
}

const CLOUD_SYNC_DOC_ID = '_aurachat_cloud_sync_v2';

// Helper to strip undefined fields recursively
function sanitizeForFirestore<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Permanently deletes items (posts, messages, chats, stories, reels, calls) on the Shared Server (`/api/delete-item`)
 */
export async function deleteItemsFromCloud(
  ids: string[],
  options?: { clearChatId?: string; clearCallsUserId?: string }
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/delete-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids,
        clearChatId: options?.clearChatId,
        clearCallsUserId: options?.clearCallsUserId
      })
    });
  } catch {}
}

/**
 * Saves a user account and their personal chat list to the Shared Server (`/api/users/sync`)
 */
export async function syncAccountToCloud(user: User, userChats?: Chat[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const cleanPayload = sanitizeForFirestore({
      user,
      ...(userChats ? { userChats } : {})
    });
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload)
    });
  } catch {}
}

let lastPlatformFingerprint = '';

/**
 * Saves platform state (accounts, chats, channels, messages, communities, posts, reels, stories)
 * to the Shared Server (`/api/platform-state`) across all browsers and devices.
 */
export async function savePlatformStateToCloud(state: CloudPlatformState): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const totalMessagesCount = state.messagesMap
      ? Object.values(state.messagesMap).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0)
      : 0;
    const totalUserChatsCount = state.userChatsMap
      ? Object.values(state.userChatsMap).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0)
      : 0;

    const currentFingerprint = JSON.stringify({
      accounts: state.savedAccounts?.map((a) => `${a.id}:${a.username}:${a.displayName}:${a.isOnline}`),
      userChats: totalUserChatsCount,
      chats: state.globalCatalogChats?.map(
        (c) =>
          `${c.id}:${c.updatedAt || 0}:${c.joinRequests?.length || 0}:${c.members?.length || 0}`
      ),
      msgs: totalMessagesCount,
      communities: state.communities?.map(
        (c) =>
          `${c.id}:${c.updatedAt || 0}:${c.joinRequests?.length || 0}:${c.subscribersUserIds?.length || 0}:${c.subscribersCount || 0}`
      ),
      posts: state.posts?.length,
      reels: state.reels?.length,
      stories: state.stories?.length,
      deleted: state.deletedIds?.length || 0
    });

    if (currentFingerprint === lastPlatformFingerprint) {
      return;
    }
    lastPlatformFingerprint = currentFingerprint;

    const cleanState = sanitizeForFirestore({
      ...state,
      updatedAt: Date.now()
    });

    await fetch('/api/platform-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanState)
    });
  } catch {}
}

/**
 * Subscribes to real-time Shared Server state updates via SSE (`/api/events`) + initial & periodic fetch (`/api/platform-state`).
 */
export function subscribeToCloudPlatformState(
  onUpdate: (cloudState: CloudPlatformState) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isDisposed = false;
  let eventSource: EventSource | null = null;

  const fetchLatestState = async () => {
    if (isDisposed) return;
    try {
      const res = await fetch('/api/platform-state', {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = (await res.json()) as CloudPlatformState;
      if (data && !isDisposed) {
        onUpdate(data);
      }
    } catch {}
  };

  // 1. Immediate initial fetch from Shared Server
  fetchLatestState();

  // 2. Real-time Server-Sent Events stream
  try {
    if ('EventSource' in window) {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('PLATFORM_STATE', (event: MessageEvent) => {
        if (isDisposed) return;
        try {
          const data = JSON.parse(event.data) as CloudPlatformState;
          if (data) {
            onUpdate(data);
          }
        } catch {}
      });

      eventSource.addEventListener('NEW_MESSAGE', (event: MessageEvent) => {
        if (isDisposed) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.chatId && data.message) {
            // Forward real-time message via window BroadcastChannel or trigger state refresh
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const ch = new BroadcastChannel('aurachat_live_messages_sync');
              ch.postMessage({
                type: 'NEW_CHAT_MESSAGE',
                chatId: data.chatId,
                message: data.message
              });
              ch.close();
            }
          }
        } catch {}
      });

      eventSource.addEventListener('MESSAGE_STATUS', (event: MessageEvent) => {
        if (isDisposed) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.chatId && data.messageId && data.status) {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const ch = new BroadcastChannel('aurachat_live_messages_sync');
              ch.postMessage({
                type: 'CHAT_READ_AND_ONLINE',
                chatId: data.chatId,
                readerId: data.userId,
                messageId: data.messageId,
                status: data.status,
                timestamp: Date.now()
              });
              ch.close();
            }
          }
        } catch {}
      });
    }
  } catch {}

  // 3. Periodic poll fallback every 300ms for instant realtime sync
  const pollInterval = setInterval(fetchLatestState, 300);

  return () => {
    isDisposed = true;
    clearInterval(pollInterval);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

/**
 * Send message directly via backend API (/api/messages)
 */
export async function sendServerMessage(msg: Message, userId?: string): Promise<Message | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || msg.senderId
      },
      body: JSON.stringify(msg)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message || null;
  } catch {
    return null;
  }
}

/**
 * Fetch messages history for a chat via backend API (/api/messages)
 */
export async function fetchServerMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
  if (typeof window === 'undefined' || !chatId) return [];
  try {
    const res = await fetch(`/api/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/**
 * Update message status via backend API (/api/messages/status)
 */
export async function updateServerMessageStatus(
  messageId: string,
  chatId: string,
  userId: string,
  status: 'sending' | 'sent' | 'delivered' | 'read'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/messages/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ messageId, chatId, userId, status })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Server-side message search across user's authorized chats (/api/messages/search)
 */
export async function searchServerMessages(query: string, userId: string, chatId?: string): Promise<Message[]> {
  if (typeof window === 'undefined' || !query || !userId) return [];
  try {
    let url = `/api/messages/search?q=${encodeURIComponent(query)}&userId=${encodeURIComponent(userId)}`;
    if (chatId) url += `&chatId=${encodeURIComponent(chatId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-user-id': userId
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/**
 * Fetch community videos and reels from backend API (/api/community-videos)
 */
export async function fetchCommunityVideos(communityId: string): Promise<CommunityVideo[]> {
  if (typeof window === 'undefined' || !communityId) return [];
  try {
    const res = await fetch(`/api/community-videos?communityId=${encodeURIComponent(communityId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.videos) ? data.videos : [];
  } catch {
    return [];
  }
}

/**
 * Publish community video or reel to backend API (/api/community-videos)
 */
export async function saveCommunityVideo(video: Partial<CommunityVideo>): Promise<CommunityVideo | null> {
  if (typeof window === 'undefined' || !video.communityId || !video.mediaUrl) return null;
  try {
    const res = await fetch('/api/community-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.video || null;
  } catch {
    return null;
  }
}

/**
 * Delete all community videos from backend API (/api/community-videos)
 */
export async function deleteAllCommunityVideos(communityId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !communityId) return false;
  try {
    const res = await fetch(`/api/community-videos?communityId=${encodeURIComponent(communityId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Update community video (/api/community-videos PUT)
 */
export async function updateCommunityVideo(video: Partial<CommunityVideo>): Promise<boolean> {
  if (typeof window === 'undefined' || !video.id) return false;
  try {
    const res = await fetch('/api/community-videos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delete single community video (/api/community-videos/one DELETE)
 */
export async function deleteCommunityVideo(videoId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !videoId) return false;
  try {
    const res = await fetch(`/api/community-videos/one?videoId=${encodeURIComponent(videoId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Toggle like on community video or reel (/api/community-videos/like)
 */
export async function likeCommunityVideo(videoId: string, increment: boolean = true): Promise<boolean> {
  if (typeof window === 'undefined' || !videoId) return false;
  try {
    const res = await fetch('/api/community-videos/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, increment })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Add comment to community video or reel (/api/community-videos/comment)
 */
export async function commentCommunityVideo(videoId: string, comment: CommunityVideoComment): Promise<boolean> {
  if (typeof window === 'undefined' || !videoId || !comment) return false;
  try {
    const res = await fetch('/api/community-videos/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, comment })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Increment view count for community video (/api/community-videos/view)
 */
export async function incrementCommunityVideoView(videoId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !videoId) return false;
  try {
    const res = await fetch('/api/community-videos/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });
    return res.ok;
  } catch {
    return false;
  }
}



export interface CallSignalPayload {
  type: 
    | 'CALL_OFFER' 
    | 'CALL_ANSWERED' 
    | 'CALL_REJECTED' 
    | 'CALL_ENDED' 
    | 'CALL_CANCELLED' 
    | 'VIDEO_TOGGLE' 
    | 'SCREEN_SHARE_STATE'
    | 'WEBRTC_OFFER'
    | 'WEBRTC_ANSWER'
    | 'WEBRTC_ICE'
    | 'LIVE_VIDEO_FRAME';
  callId: string;
  signalId?: string;
  seq?: number;
  senderPeerId?: string;
  callerId?: string;
  callerName?: string;
  callerUsername?: string;
  callerAvatar?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  targetUsername?: string;
  targetPhone?: string;
  targetName?: string;
  responderId?: string;
  quickResponse?: string;
  isVideo?: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing?: boolean;
  frameDataUrl?: string;
  frameSource?: 'camera' | 'screen';
  sdp?: string;
  candidate?: any;
  timestamp: number;
}

/**
 * Publishes a real-time call signal (OFFER, ANSWER, REJECT, END, CANCEL, WEBRTC) to the Shared Server (`/api/call-signal`).
 */
export async function publishCallSignalToCloud(signal: CallSignalPayload): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const cleanSignal = sanitizeForFirestore({
      ...signal,
      signalId: signal.signalId || `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: Date.now()
    });
    await fetch('/api/call-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanSignal)
    });
  } catch {}
}

/**
 * Subscribes to real-time call signals from the Shared Server (`/api/events` & `/api/call-signal`) across all devices and accounts.
 */
export function subscribeToCallSignalsFromCloud(
  onSignal: (signal: CallSignalPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isDisposed = false;
  let lastSeenSeq = 0;
  const processedSignalIds = new Set<string>();
  let eventSource: EventSource | null = null;

  const handleIncomingSignal = (sig: CallSignalPayload | null) => {
    if (!sig || !sig.timestamp || isDisposed) return;
    if (Date.now() - sig.timestamp > 120000) return;

    const uniqueKey = sig.signalId || `${sig.type}_${sig.callId}_${sig.seq || sig.timestamp}`;
    if (sig.type !== 'LIVE_VIDEO_FRAME') {
      if (processedSignalIds.has(uniqueKey)) return;
      processedSignalIds.add(uniqueKey);
      if (processedSignalIds.size > 300) {
        const first = processedSignalIds.values().next().value;
        if (first) processedSignalIds.delete(first);
      }
    }

    if (typeof sig.seq === 'number' && sig.seq > lastSeenSeq) {
      lastSeenSeq = sig.seq;
    }

    onSignal(sig);
  };

  try {
    if ('EventSource' in window) {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('CALL_SIGNAL', (event: MessageEvent) => {
        if (isDisposed) return;
        try {
          const data = JSON.parse(event.data) as CallSignalPayload;
          handleIncomingSignal(data);
        } catch {}
      });
    }
  } catch {}

  const pollTimer = setInterval(async () => {
    if (isDisposed) return;
    try {
      const res = await fetch(`/api/call-signal?sinceSeq=${lastSeenSeq}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.signals) && data.signals.length > 0) {
        data.signals.forEach((sig: CallSignalPayload) => handleIncomingSignal(sig));
      } else if (data?.signal) {
        handleIncomingSignal(data.signal);
      }
    } catch {}
  }, 200);

  return () => {
    isDisposed = true;
    clearInterval(pollTimer);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

export async function fetchVideoWatchPosition(videoId: string, userId: string): Promise<number> {
  try {
    const res = await fetch(`/api/community-videos/watch-position?videoId=${encodeURIComponent(videoId)}&userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data.positionSec || 0);
  } catch {
    return 0;
  }
}

export async function saveVideoWatchPosition(videoId: string, userId: string, positionSec: number): Promise<boolean> {
  try {
    const res = await fetch('/api/community-videos/watch-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId, positionSec })
    });
    return res.ok;
  } catch {
    return false;
  }
}




