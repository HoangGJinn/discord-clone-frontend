/**
 * Time formatting utilities for chat UI.
 *
 * Single Responsibility: Only handles date/time string formatting.
 * All functions are pure — no side effects.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const CHAT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const toSafeDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }
  return new Date();
};

/**
 * Formats a date string into a relative timestamp for conversation lists.
 * Examples: "Just now", "5m", "3h", "Yesterday", "Mon", "Apr 7"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = toSafeDate(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;

  if (diff < 2 * DAY) return 'Yesterday';

  if (diff < WEEK) {
    return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: CHAT_TIMEZONE });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: CHAT_TIMEZONE,
  });
}

/**
 * Formats a date string into a readable time for message bubbles.
 * Examples: "2:30 PM", "Yesterday at 2:30 PM", "04/07/2026 2:30 PM"
 */
export function formatMessageTime(dateStr: string): string {
  const date = toSafeDate(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: CHAT_TIMEZONE,
  });

  if (diff < DAY && date.getDate() === now.getDate()) {
    return `Today at ${timeStr}`;
  }

  if (diff < 2 * DAY) {
    return `Yesterday at ${timeStr}`;
  }

  const datePrefix = date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: CHAT_TIMEZONE,
  });

  return `${datePrefix} ${timeStr}`;
}

/**
 * Checks if two date strings fall on different calendar days.
 * Used to render date separators between message groups.
 */
export function isDifferentDay(dateStr1: string, dateStr2: string): boolean {
  const d1 = toSafeDate(dateStr1);
  const d2 = toSafeDate(dateStr2);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

/**
 * Formats a date string into a day separator label.
 * Examples: "Today", "Yesterday", "Monday, April 7, 2026"
 */
export function formatDaySeparator(dateStr: string): string {
  const date = toSafeDate(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < DAY && date.getDate() === now.getDate()) return 'Today';
  if (diff < 2 * DAY) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: CHAT_TIMEZONE,
  });
}
