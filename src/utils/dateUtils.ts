/**
 * Utility functions for dynamic VK / Telegram style date and time formatting.
 * Formats recent events as "Только что", "1 мин назад", "15 мин назад", "2 ч назад"
 * and older events as "09.11.26" (DD.MM.YY format with year).
 */

export function formatSmartTime(timeInput?: string | number | Date | null): string {
  if (!timeInput) return 'Только что';

  let date: Date;

  if (timeInput instanceof Date) {
    date = timeInput;
  } else if (typeof timeInput === 'number') {
    date = new Date(timeInput);
  } else {
    const raw = String(timeInput).trim();
    if (!raw) return 'Только что';

    // If string already matches "09.11.26" or HH:MM format
    if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(raw)) return raw;

    // Check if it's ISO string or numeric string
    const num = Number(raw);
    if (!isNaN(num) && num > 1000000000) {
      date = new Date(num);
    } else {
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      } else {
        // Fallback if string is formatted like "14:32" or "Только что"
        return raw;
      }
    }
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'Только что';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  // Less than 1 minute
  if (diffMin < 1) {
    return 'Только что';
  }

  // Less than 60 minutes
  if (diffMin < 60) {
    return `${diffMin} мин назад`;
  }

  // Same calendar day
  const isSameDay =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  if (isSameDay) {
    const hoursStr = String(date.getHours()).padStart(2, '0');
    const minsStr = String(date.getMinutes()).padStart(2, '0');
    return `${hoursStr}:${minsStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  if (isYesterday) {
    const hoursStr = String(date.getHours()).padStart(2, '0');
    const minsStr = String(date.getMinutes()).padStart(2, '0');
    return `вчера в ${hoursStr}:${minsStr}`;
  }

  // Older than yesterday: DD.MM.YY format with 2-digit year e.g. 09.11.26
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearStr = String(date.getFullYear()).slice(-2); // e.g. 26

  return `${dayStr}.${monthStr}.${yearStr}`;
}

/**
 * Returns formatted time string or timestamp for storing in chat.lastMessageTime
 */
export function getCurrentFormattedTime(): string {
  return formatSmartTime(new Date());
}
