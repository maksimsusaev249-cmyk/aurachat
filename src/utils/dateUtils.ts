/**
 * Utility functions for dynamic VK / Telegram style date, time, and presence formatting.
 * Formats recent events as "1 мин назад", "15 мин назад",
 * and older events as "06.11.26" (DD.MM.YY format with 2-digit year).
 */

export function formatDateDDMMYY(date: Date): string {
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearStr = String(date.getFullYear()).slice(-2);
  return `${dayStr}.${monthStr}.${yearStr}`;
}

const TIME_ANCHORS_STORAGE_KEY = 'chatix_time_anchors_v1';
let memoryTimeAnchors: Record<string, number> | null = null;

function getTimeAnchorsMap(): Record<string, number> {
  if (memoryTimeAnchors) return memoryTimeAnchors;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(TIME_ANCHORS_STORAGE_KEY);
      if (raw) {
        memoryTimeAnchors = JSON.parse(raw);
        return memoryTimeAnchors!;
      }
    }
  } catch {}
  memoryTimeAnchors = {};
  return memoryTimeAnchors;
}

function saveTimeAnchor(key: string, timestampMs: number): void {
  const map = getTimeAnchorsMap();
  map[key] = timestampMs;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(TIME_ANCHORS_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Extracts a 13-digit Unix timestamp (ms) from an entity ID such as "post_1793905285670" or "reel_1793905285670"
 */
export function extractTimestampFromId(entityId?: string): number | null {
  if (!entityId) return null;
  const match = String(entityId).match(/(1\d{12})/);
  if (match && match[1]) {
    const ts = Number(match[1]);
    if (!isNaN(ts) && ts > 1500000000000 && ts <= Date.now() + 86400000) {
      return ts;
    }
  }
  return null;
}

/**
 * Normalizes any post/reel/comment createdAt value into a real ISO timestamp string
 * so that the publication timer always ticks forward in real time.
 */
export function normalizeCreatedAtIso(createdAt?: string | number | Date | null, entityId?: string): string {
  if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
    return createdAt.toISOString();
  }
  if (typeof createdAt === 'number' && !isNaN(createdAt)) {
    return new Date(createdAt).toISOString();
  }
  const raw = createdAt ? String(createdAt).trim() : '';
  if (raw) {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  const idTs = extractTimestampFromId(entityId);
  if (idTs) {
    return new Date(idTs).toISOString();
  }
  if (entityId) {
    const anchors = getTimeAnchorsMap();
    if (anchors[entityId]) {
      return new Date(anchors[entityId]).toISOString();
    }
    const nowMs = Date.now();
    saveTimeAnchor(entityId, nowMs);
    return new Date(nowMs).toISOString();
  }
  return new Date().toISOString();
}

export function formatSmartTime(
  timeInput?: string | number | Date | null,
  entityId?: string,
  _nowTick?: number
): string {
  const now = new Date();
  const nowMs = now.getTime();
  let date: Date | null = null;

  // 1. First check if entityId embeds the exact creation timestamp (e.g. post_1793905285670)
  const idTs = extractTimestampFromId(entityId);

  if (timeInput instanceof Date) {
    date = timeInput;
  } else if (typeof timeInput === 'number') {
    date = new Date(timeInput);
  } else if (timeInput) {
    const raw = String(timeInput).trim();
    const lower = raw.toLowerCase();

    if (lower === 'вчера' || lower.startsWith('вчера')) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return formatDateDDMMYY(yesterday);
    }

    if (lower === 'сегодня') {
      return formatDateDDMMYY(now);
    }

    // Already in DD.MM.YY or DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(raw)) {
      const parts = raw.split('.');
      if (parts[2] && parts[2].length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2].slice(-2)}`;
      }
      return raw;
    }

    // Check if it's numeric timestamp or ISO string
    const num = Number(raw);
    if (!isNaN(num) && num > 1000000000) {
      date = new Date(num);
    } else {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      } else if (idTs) {
        // Use exact creation timestamp from entityId (post_17939..., reel_17939..., etc.)
        date = new Date(idTs);
      } else if (
        lower === 'только что' ||
        lower === 'сейчас' ||
        /^\d+\s*(мин|минут|минуты|ч|час|часа|часов)\s*назад$/i.test(raw)
      ) {
        // Anchor relative string to a real timestamp in localStorage so it ticks forward every minute!
        const anchorKey = entityId || `raw_${lower}`;
        const anchors = getTimeAnchorsMap();
        if (anchors[anchorKey]) {
          date = new Date(anchors[anchorKey]);
        } else {
          let initialOffsetMs = 0;
          const minMatch = lower.match(/^(\d+)\s*(мин|минут|минуты)/i);
          const hourMatch = lower.match(/^(\d+)\s*(ч|час|часа|часов)/i);
          if (minMatch) {
            const m = Math.max(1, Number(minMatch[1]));
            initialOffsetMs = (m - 1) * 60 * 1000;
          } else if (hourMatch) {
            const h = Math.max(1, Number(hourMatch[1]));
            initialOffsetMs = h * 3600 * 1000;
          }
          const anchoredMs = nowMs - initialOffsetMs;
          saveTimeAnchor(anchorKey, anchoredMs);
          date = new Date(anchoredMs);
        }
      } else if (/^\d{1,2}:\d{2}$/.test(raw)) {
        // Convert HH:MM of today into a Date to compute minutes ago or DD.MM.YY
        const [hh, mm] = raw.split(':').map(Number);
        const candidate = new Date(now);
        candidate.setHours(hh, mm, 0, 0);
        if (candidate.getTime() > nowMs) {
          candidate.setDate(candidate.getDate() - 1);
        }
        date = candidate;
      } else {
        return raw;
      }
    }
  } else if (idTs) {
    date = new Date(idTs);
  }

  if (!date || isNaN(date.getTime())) {
    return '1 мин назад';
  }

  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  // Starts at "1 мин назад" upon publication (0..59s -> 1 мин назад, 60..119s -> 2 мин назад, 120..179s -> 3 мин назад, etc.)
  if (diffMin < 59) {
    const mins = diffMin + 1;
    return `${mins} мин назад`;
  }
  if (diffMin === 59) {
    return '59 мин назад';
  }

  // Up to 5 hours ago on the same day -> "1 ч назад", "2 ч назад", etc.
  if (diffHours < 6) {
    return `${diffHours} ч назад`;
  }

  // Older than 6 hours ("если давно висит то 06.11.26 вот так") -> DD.MM.YY
  return formatDateDDMMYY(date);
}

/**
 * Formats how long ago a user exited the social network:
 * - Just exited (< 90 sec): "был(а) только что в сети"
 * - 1..5 min ago: "был(а) X мин назад"
 * - 6..59 min ago: "был(а) в сети недавно"
 * - >= 6 hours ago: "был(а) 06.11.26"
 */
export function formatAutoOfflineStatus(offlineAtMs: number): string {
  const diffMs = Math.max(0, Date.now() - offlineAtMs);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 90) {
    return 'был(а) только что в сети';
  }
  if (diffMin <= 5) {
    return `был(а) ${diffMin} мин назад`;
  }
  if (diffHours < 6) {
    return 'был(а) в сети недавно';
  }
  return `был(а) ${formatDateDDMMYY(new Date(offlineAtMs))}`;
}

/**
 * Formats user's online / last seen status realistically and automatically for all users.
 * - If user is in the app (and not in Ghost Mode): "в сети"
 * - If user exited the app: "был(а) только что в сети" -> "был(а) X мин назад" -> "был(а) в сети недавно" -> "был(а) 06.11.26"
 */
export function getUserPresenceStatus(
  user?: {
    id?: string;
    userId?: string;
    username?: string;
    displayName?: string;
    isOnline?: boolean;
    lastSeen?: string | number;
    statusText?: string;
    hideOnlineStatus?: boolean;
    settings?: any;
  } | null,
  currentUserId?: string,
  activePeerMap?: Record<string, number>,
  savedAccounts?: Array<{
    id: string;
    username: string;
    displayName: string;
    isOnline?: boolean;
    lastSeen?: string;
    hideOnlineStatus?: boolean;
    settings?: any;
  }>
): { isOnline: boolean; statusText: string } {
  if (!user) {
    return { isOnline: false, statusText: 'был(а) в сети недавно' };
  }

  const uid = user.id || user.userId || '';
  const uname = (user.username || '').toLowerCase();
  const dname = (user.displayName || '').toLowerCase();

  // Match against synced savedAccounts so everyone sees the exact status set or auto-updated for that account
  const syncedAccount = savedAccounts?.find(
    (a) =>
      (uid && a.id === uid) ||
      (uname && a.username.toLowerCase() === uname) ||
      (dname && a.displayName.toLowerCase() === dname)
  );

  const effectiveUser = syncedAccount || user;

  if (effectiveUser.hideOnlineStatus) {
    return { isOnline: false, statusText: 'был(а) в сети недавно' };
  }

  const offlineAt = effectiveUser.settings?.offlineAt;
  const statusMode = effectiveUser.settings?.presenceMode || 'auto'; // 'auto' | 'manual'

  // If manual status is set by the user in Settings, everyone sees that exact status
  if (statusMode === 'manual' && effectiveUser.lastSeen) {
    const manualText = String(effectiveUser.lastSeen).trim();
    const isManualOnline = manualText.toLowerCase() === 'в сети';
    return {
      isOnline: isManualOnline,
      statusText: manualText
    };
  }

  // If this is the currently logged-in active user in auto mode
  if (currentUserId && uid === currentUserId) {
    if (effectiveUser.isOnline === false && offlineAt) {
      return { isOnline: false, statusText: formatAutoOfflineStatus(offlineAt) };
    }
    if (effectiveUser.lastSeen && effectiveUser.lastSeen !== 'в сети' && effectiveUser.isOnline === false) {
      return { isOnline: false, statusText: String(effectiveUser.lastSeen) };
    }
    return { isOnline: true, statusText: 'в сети' };
  }

  // Check if synced account is marked online right now
  if (syncedAccount) {
    if (syncedAccount.isOnline && (syncedAccount.lastSeen === 'в сети' || !syncedAccount.lastSeen)) {
      return { isOnline: true, statusText: 'в сети' };
    }
    if (!syncedAccount.isOnline && offlineAt) {
      return { isOnline: false, statusText: formatAutoOfflineStatus(offlineAt) };
    }
    if (syncedAccount.lastSeen) {
      const ls = String(syncedAccount.lastSeen).trim();
      return {
        isOnline: ls.toLowerCase() === 'в сети',
        statusText: ls
      };
    }
  }

  // Check if we have a real-time activity timestamp for this user
  const activeTs = activePeerMap && uid ? activePeerMap[uid] : undefined;
  if (activeTs) {
    const diffMs = Date.now() - activeTs;
    if (diffMs < 90 * 1000) {
      return { isOnline: true, statusText: 'в сети' };
    }
    return {
      isOnline: false,
      statusText: formatAutoOfflineStatus(activeTs)
    };
  }

  const rawStatus = user.statusText || (user.lastSeen ? String(user.lastSeen) : '');
  const trimmed = rawStatus.trim();

  if (trimmed) {
    if (trimmed.toLowerCase() === 'в сети') {
      return { isOnline: Boolean(user.isOnline), statusText: user.isOnline ? 'в сети' : 'был(а) только что в сети' };
    }
    if (trimmed.toLowerCase().startsWith('был')) {
      return { isOnline: false, statusText: trimmed };
    }
  }

  return { isOnline: false, statusText: 'был(а) в сети недавно' };
}

/**
 * Returns current ISO timestamp for storing in createdAt / lastMessageTime
 */
export function getCurrentFormattedTime(): string {
  return new Date().toISOString();
}

