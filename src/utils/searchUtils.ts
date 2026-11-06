import { User, Chat, Community } from '../types';
import { initialContactsList, ContactItem } from '../components/messenger/ContactsModal';

/**
 * Normalizes phone numbers and checks if a query matches the phone.
 * Handles:
 * - Direct substring matches (e.g. "+7 (916)")
 * - Raw digits match (e.g. "9165550123" matches "+7 (916) 555-01-23")
 * - 8 vs +7 prefix equivalence for Russian numbers (e.g. "89165550123" matches "+79165550123")
 * - Partial search (minimum 3 digits, e.g. "55501" or "916")
 */
export function matchPhoneNumber(userPhone?: string, rawQuery?: string): boolean {
  if (!userPhone || !rawQuery) return false;
  const qTrimmed = rawQuery.trim().replace(/^@/, '');
  if (!qTrimmed) return false;

  // Direct string match
  if (userPhone.toLowerCase().includes(qTrimmed.toLowerCase())) return true;

  // Numeric digit comparison
  const qDigits = qTrimmed.replace(/\D/g, '');
  const pDigits = userPhone.replace(/\D/g, '');

  if (qDigits.length >= 3 && pDigits.includes(qDigits)) return true;

  // Prefix equivalence: '8' <-> '7' for 11-digit numbers
  if (qDigits.length >= 4) {
    const normQ = qDigits.length >= 10 && qDigits.startsWith('8') ? '7' + qDigits.slice(1) : qDigits;
    const normP = pDigits.length >= 10 && pDigits.startsWith('8') ? '7' + pDigits.slice(1) : pDigits;
    if (normP.includes(normQ) || normQ.includes(normP)) return true;
  }

  return false;
}

/**
 * Checks if search query matches user text (name, username, bio, email)
 */
export function matchUserText(target?: string, rawQuery?: string): boolean {
  if (!target || !rawQuery) return false;
  const cleanTarget = target.toLowerCase();
  const cleanQ = rawQuery.trim().toLowerCase().replace(/^@/, '');
  if (!cleanQ) return false;
  return cleanTarget.includes(cleanQ);
}

/**
 * Checks if query is a keyword for a specific category (e.g. "сообщество", "канал", "беседа")
 * IMPORTANT: avoids `'сообщество'.includes(query)` which matches single characters like 'с' or 'о'.
 */
export function isCategoryKeywordMatch(cleanQuery: string, keywords: string[]): boolean {
  if (!cleanQuery || cleanQuery.length < 3) return false;
  const q = cleanQuery.toLowerCase();
  return keywords.some((kw) => kw === q || (q.length >= 4 && kw.startsWith(q)) || (q.length >= 4 && q.startsWith(kw)));
}

export interface DirectoryUser {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  phone?: string;
  email?: string;
  bio?: string;
  isOnline?: boolean;
  statusText?: string;
}

/**
 * Builds a unified, deduplicated directory of ALL users across the platform:
 * - Saved accounts in state & localStorage
 * - Current user
 * - Custom contacts in localStorage & initial contacts
 * - Members from all user chats & catalog chats
 * - Community creators and moderators
 */
export function getUnifiedGlobalUsersDirectory(
  allUsers: User[] = [],
  currentUserId?: string,
  chats: Chat[] = [],
  globalCatalogChats: Chat[] = [],
  communities: Community[] = []
): DirectoryUser[] {
  const map = new Map<string, DirectoryUser>();

  const registerUser = (user: DirectoryUser) => {
    if (!user.userId && !user.username) return;
    if (currentUserId && user.userId === currentUserId) return;

    // Use username or userId as primary deduplication key
    const primaryKey = (user.username || user.userId).toLowerCase().replace(/^@/, '');
    const existing = map.get(primaryKey);

    if (!existing) {
      map.set(primaryKey, user);
    } else {
      // Merge extra details (phone, email, bio)
      map.set(primaryKey, {
        ...existing,
        phone: existing.phone || user.phone,
        email: existing.email || user.email,
        bio: existing.bio || user.bio,
        isOnline: existing.isOnline !== undefined ? existing.isOnline : user.isOnline,
        statusText: existing.statusText || user.statusText
      });
    }

    if (user.userId && !map.has(user.userId.toLowerCase())) {
      map.set(user.userId.toLowerCase(), map.get(primaryKey)!);
    }
  };

  // 1. Saved Accounts & Current User
  allUsers.forEach((u) => {
    registerUser({
      userId: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      phone: u.phone,
      email: u.email,
      bio: u.bio,
      isOnline: u.isOnline,
      statusText: u.lastSeen || (u.isOnline ? 'в сети' : 'был(а) недавно')
    });
  });

  // 2. Extra saved accounts from LocalStorage
  try {
    const raw = localStorage.getItem('aurachat_savedAccounts_v3') || localStorage.getItem('aurachat_savedAccounts');
    if (raw) {
      const parsed: User[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u) => {
          registerUser({
            userId: u.id,
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl,
            phone: u.phone,
            email: u.email,
            bio: u.bio,
            isOnline: u.isOnline,
            statusText: u.lastSeen
          });
        });
      }
    }
  } catch {}

  // 3. Custom contacts from LocalStorage
  try {
    const rawContacts = localStorage.getItem('aurachat_custom_contacts');
    if (rawContacts) {
      const parsedContacts: ContactItem[] = JSON.parse(rawContacts);
      if (Array.isArray(parsedContacts)) {
        parsedContacts.forEach((c) => {
          registerUser({
            userId: c.userId,
            displayName: c.displayName,
            username: c.username,
            avatarUrl: c.avatarUrl,
            phone: c.phone,
            bio: c.statusText,
            isOnline: c.isOnline,
            statusText: c.statusText
          });
        });
      }
    }
  } catch {}

  // 4. Default Contacts
  initialContactsList.forEach((c) => {
    registerUser({
      userId: c.userId,
      displayName: c.displayName,
      username: c.username,
      avatarUrl: c.avatarUrl,
      phone: c.phone,
      bio: c.statusText,
      isOnline: c.isOnline,
      statusText: c.statusText
    });
  });

  // 5. Members from all user chats
  chats.forEach((chat) => {
    chat.members.forEach((m) => {
      registerUser({
        userId: m.userId,
        displayName: m.displayName,
        username: m.username,
        avatarUrl: m.avatarUrl,
        bio: m.customTitle
      });
    });
  });

  // 6. Members from global catalog chats
  globalCatalogChats.forEach((chat) => {
    chat.members.forEach((m) => {
      registerUser({
        userId: m.userId,
        displayName: m.displayName,
        username: m.username,
        avatarUrl: m.avatarUrl,
        bio: m.customTitle
      });
    });
  });

  // 7. Community owners and moderators
  communities.forEach((comm) => {
    if (comm.ownerUsername) {
      registerUser({
        userId: comm.ownerId,
        displayName: comm.ownerName,
        username: comm.ownerUsername,
        avatarUrl: comm.ownerAvatar || comm.avatarUrl,
        bio: `Создатель сообщества «${comm.title}»`
      });
    }
  });

  // Deduplicate array values
  const uniqueUsers: DirectoryUser[] = [];
  const seenUserIds = new Set<string>();

  map.forEach((u) => {
    const idKey = (u.userId || u.username).toLowerCase();
    if (!seenUserIds.has(idKey)) {
      seenUserIds.add(idKey);
      uniqueUsers.push(u);
    }
  });

  return uniqueUsers;
}
