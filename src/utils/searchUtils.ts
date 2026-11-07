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

const RU_TO_EN_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

export function transliterateToLatin(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => (RU_TO_EN_MAP[ch] !== undefined ? RU_TO_EN_MAP[ch] : ch))
    .join('');
}

/**
 * Checks if search query matches user text (name, username, bio, email, id)
 * Supports:
 * - Case-insensitive substring matching
 * - Cyrillic <-> Latin transliteration (e.g. "ИГОРЬ" <-> "igor", "МАКСИМ" <-> "maksim")
 * - Prefix + digits equivalence: "USER_7564" matches "Абонент 7564" / "@abonent_7564" / "7564"
 */
export function matchUserText(target?: string, rawQuery?: string): boolean {
  if (!target || !rawQuery) return false;
  const cleanTarget = target.toLowerCase().replace(/^@/, '');
  const cleanQ = rawQuery.trim().toLowerCase().replace(/^@/, '');
  if (!cleanQ) return false;

  // 1. Direct substring match
  if (cleanTarget.includes(cleanQ)) return true;

  // 2. Ignore spaces vs underscores (e.g. "user 7564" vs "user_7564", "абонент_7564" vs "абонент 7564")
  const normTarget = cleanTarget.replace(/[\s_\-]+/g, '');
  const normQ = cleanQ.replace(/[\s_\-]+/g, '');
  if (normQ.length >= 2 && normTarget.includes(normQ)) return true;

  // 3. Cyrillic <-> Latin transliteration match (e.g. "игорь" <-> "igor", "максим" <-> "maksim")
  const latinTarget = transliterateToLatin(cleanTarget).replace(/[\s_\-]+/g, '');
  const latinQ = transliterateToLatin(cleanQ).replace(/[\s_\-]+/g, '');
  if (latinQ.length >= 2 && latinTarget.includes(latinQ)) return true;

  // 4. User / Abonent numeric ID equivalence:
  // If user searches "user_7564", "usr_7564", "abonent_7564", "абонент 7564" -> match "7564" in "Абонент 7564" or "@abonent_7564" or "@user_7564"
  const prefixDigitsMatch = cleanQ.match(/^(?:user|usr|u|abonent|абонент|юзер)[\s_\-]*(\d{2,})$/i);
  if (prefixDigitsMatch) {
    const digits = prefixDigitsMatch[1];
    if (cleanTarget.includes(digits)) return true;
  }

  return false;
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

const DEMO_MOCK_IDS = new Set([
  'usr_me',
  'usr_durov',
  'u_durov',
  'usr_elena',
  'usr_mark',
  'usr_alex',
  'usr_sofia',
  'u_anna',
  'usr_spammer_1',
  'usr_troll_1'
]);

const DEMO_MOCK_USERNAMES = new Set([
  'alex_dev',
  'durov',
  'elena_ux',
  'mark_arch',
  'alex_ops',
  'sofia_live'
]);

export function isMockOrDemoAccount(u: any): boolean {
  if (!u) return true;
  const id = String(u.id || u.userId || '').trim();
  const uname = String(u.username || '').trim().toLowerCase().replace(/^@/, '');
  if (!id) return true;
  if (DEMO_MOCK_IDS.has(id)) return true;
  if (id.startsWith('peer_') || id.startsWith('usr_')) return true;
  if (DEMO_MOCK_USERNAMES.has(uname)) return true;
  return false;
}

/**
 * Builds a unified, deduplicated directory of ALL real users across the platform:
 * - Registered accounts from state & Shared Server
 * - Custom contacts in localStorage
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
    if (!user.userId && !user.username && !user.displayName) return;
    if (isMockOrDemoAccount(user)) return;
    if (user.displayName === 'Избранное' || user.displayName?.startsWith?.('Избранное')) return;
    if (currentUserId && user.userId === currentUserId) return;

    const rawUsername = (user.username || user.userId || user.displayName)
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/\s+/g, '_');
    const primaryKey = rawUsername;
    const existing = map.get(primaryKey);

    if (!existing) {
      map.set(primaryKey, {
        ...user,
        username: user.username || rawUsername
      });
    } else {
      map.set(primaryKey, {
        ...existing,
        displayName: existing.displayName || user.displayName,
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

  // 1. Registered Accounts from State & Shared Server
  allUsers.forEach((u) => {
    if (!u || isMockOrDemoAccount(u)) return;
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

  // 2. Custom contacts from LocalStorage
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

  // 3. Real members from user chats
  const registerFromChatList = (chatList: Chat[]) => {
    if (!Array.isArray(chatList)) return;
    chatList.forEach((chat) => {
      if (!chat || !Array.isArray(chat.members)) return;
      chat.members.forEach((m) => {
        if (isMockOrDemoAccount(m)) return;
        registerUser({
          userId: m.userId,
          displayName: m.displayName,
          username: m.username,
          avatarUrl: m.avatarUrl,
          bio: m.customTitle || 'Пользователь AuraChat'
        });
      });
    });
  };

  registerFromChatList(chats);
  registerFromChatList(globalCatalogChats);

  // 4. Community owners (only real non-mock owners)
  communities.forEach((comm) => {
    if (comm.ownerUsername && !isMockOrDemoAccount({ id: comm.ownerId, username: comm.ownerUsername })) {
      registerUser({
        userId: comm.ownerId,
        displayName: comm.ownerName,
        username: comm.ownerUsername,
        avatarUrl: comm.ownerAvatar || comm.avatarUrl,
        bio: `Создатель сообщества «${comm.title}»`
      });
    }
  });

  // Deduplicate array values by displayName/username
  const uniqueUsers: DirectoryUser[] = [];
  const seenKeys = new Set<string>();

  map.forEach((u) => {
    const idKey = (u.userId || u.username).toLowerCase();
    const nameKey = `${u.displayName.toLowerCase()}__${u.username.toLowerCase()}`;
    if (!seenKeys.has(idKey) && !seenKeys.has(nameKey)) {
      seenKeys.add(idKey);
      seenKeys.add(nameKey);
      uniqueUsers.push(u);
    }
  });

  return uniqueUsers;
}


