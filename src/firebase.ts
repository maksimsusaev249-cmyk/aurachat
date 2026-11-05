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
import { getFirestore, doc, getDocFromServer, setDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Chat, Message, Story, Post, Community, CallRecord } from './types';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initial connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or connectivity.");
    }
  }
}

testConnection();

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

  // Sync profile document to Firestore
  try {
    await setDoc(doc(db, 'users', fbUser.uid), {
      id: mappedUser.id,
      displayName: mappedUser.displayName,
      username: mappedUser.username,
      avatarUrl: mappedUser.avatarUrl,
      email: mappedUser.email || '',
      phone: mappedUser.phone || '',
      bio: mappedUser.bio,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }

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

  // Sync profile document to Firestore
  try {
    await setDoc(doc(db, 'users', fbUser.uid), {
      id: mappedUser.id,
      displayName: mappedUser.displayName,
      username: mappedUser.username,
      avatarUrl: mappedUser.avatarUrl,
      email: mappedUser.email,
      bio: mappedUser.bio,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
  }

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
  const username = `u_${phoneClean.replace(/[^0-9]/g, '').slice(-6)}`;

  const mappedUser: User = {
    id: fbUser.uid,
    displayName: fbUser.displayName || `Пользователь ${phoneClean}`,
    username,
    phone: phoneClean,
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}&backgroundColor=1e293b`,
    bio: 'AuraChat • Вход по номеру телефона',
    isOnline: true,
    lastSeen: 'в сети'
  };

  try {
    await setDoc(doc(db, 'users', fbUser.uid), {
      id: mappedUser.id,
      displayName: mappedUser.displayName,
      username: mappedUser.username,
      avatarUrl: mappedUser.avatarUrl,
      phone: mappedUser.phone,
      bio: mappedUser.bio,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }

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
  updatedAt?: number;
  updatedBy?: string;
}

const CLOUD_SYNC_DOC_ID = '_aurachat_cloud_sync_v2';

// Helper to strip undefined fields recursively so Firestore setDoc never rejects undefined values
function sanitizeForFirestore<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Saves a user account and their personal chat list to Firestore `/users/{userId}` when online.
 */
export async function syncAccountToCloud(user: User, userChats?: Chat[]): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const payload = sanitizeForFirestore({
      ...user,
      ...(userChats ? { userChats } : {}),
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'users', user.id), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
  }
}

/**
 * Saves platform state (accounts, chats, channels, messages, communities, posts, reels, stories)
 * to Firestore `/chats/_aurachat_cloud_sync_v2` when online.
 */
export async function savePlatformStateToCloud(state: CloudPlatformState): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const cleanState = sanitizeForFirestore({
      ...state,
      updatedAt: Date.now()
    });
    await setDoc(doc(db, 'chats', CLOUD_SYNC_DOC_ID), cleanState, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${CLOUD_SYNC_DOC_ID}`);
  }
}

/**
 * Subscribes to real-time Cloud Firestore state updates when online.
 */
export function subscribeToCloudPlatformState(
  onUpdate: (cloudState: CloudPlatformState) => void
): () => void {
  try {
    const unsub = onSnapshot(
      doc(db, 'chats', CLOUD_SYNC_DOC_ID),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as CloudPlatformState;
          onUpdate(data);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `chats/${CLOUD_SYNC_DOC_ID}`);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

