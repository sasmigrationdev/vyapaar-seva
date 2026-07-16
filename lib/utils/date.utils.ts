import { format, parse, startOfMonth, endOfMonth, subMonths, addMonths, differenceInDays } from 'date-fns';

/**
 * Format date to YYYY-MM-DD
 */
export const formatDateToISO = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Format date to readable format (e.g., Jan 1, 2024)
 */
export const formatDateToReadable = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
};

/**
 * Format time to HH:mm format
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm');
};

/**
 * Format a timestamp as a 12-hour clock time with AM/PM (e.g. "10:00 AM").
 * Prefer this for user-facing copy such as notifications.
 */
export const formatClockTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'hh:mm a');
};

/**
 * Extract the local HH:mm from a stored attendance timestamp, guarding against
 * the "05:30 AM" corruption bug.
 *
 * A check_in_time stored at exactly UTC midnight (e.g. "2026-07-06T00:00:00+00:00")
 * is an artifact: in IST it reads back as 05:30, and re-saving it recomputes the
 * same UTC-midnight value — a self-perpetuating loop. A genuine HR-picked time
 * (e.g. 09:00 -> 03:30Z) or self check-in never lands on exact UTC midnight, so we
 * treat exact UTC midnight (and date-only / empty values) as "no time set" and
 * return an empty string. Callers then force HR to pick a real time.
 */
export const timeFromStoredTimestamp = (
  value: string | null | undefined
): string => {
  if (!value) return '';
  // Date-only values ("2026-07-06") carry no time-of-day.
  if (!String(value).includes('T')) return '';

  const d = new Date(value);
  if (isNaN(d.getTime())) return '';

  // Exact UTC midnight == the corruption artifact (05:30 IST). Treat as unset.
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return '';
  }

  return format(d, 'HH:mm');
};

/**
 * True when `t` is a well-formed 24-hour wall-clock string ("H:mm" / "HH:mm")
 * with an in-range hour (0–23) and minute (0–59). Used to reject empty or
 * garbage time input BEFORE it can be built into a Date and silently stored as
 * local midnight (which reads back as 12:00 AM — the low end of the corrupt
 * 00:00–05:30 IST band).
 */
export const isValidClockTime = (t: string | null | undefined): t is string => {
  if (typeof t !== 'string' || !/^\d{1,2}:\d{2}$/.test(t)) return false;
  const [hour, minute] = t.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

/**
 * Build a Date from a local calendar date ("YYYY-MM-DD") and wall-clock time
 * ("HH:mm"), interpreted in the device's local timezone. Returns `null` when
 * either part is missing/invalid — callers MUST treat that as "no valid time"
 * and refuse to save, rather than storing a bogus instant.
 *
 * Why not `new Date(dateStr)` + `.setHours()`: a date-only string parses as UTC
 * midnight, but `.setHours()` then mutates in local time. Mixing the two shifts
 * the calendar day in any timezone with a non-zero offset and is exactly what
 * pushed HR-entered times into the 00:00–05:30 IST band (UTC+5:30). Constructing
 * straight from numeric parts keeps the wall-clock the admin typed on the exact
 * date they picked, so `.toISOString()` stores the correct instant and
 * `format(d, 'HH:mm')` reads the same value back — even for back-dated entries.
 *
 * Boundary disambiguation: a genuine time that lands on EXACT UTC midnight
 * (e.g. 05:30 IST -> 00:00:00Z) is indistinguishable from the legacy corruption
 * sentinel that `timeFromStoredTimestamp` treats as "unset". To stop a real
 * 05:30 check-in from being eaten, we nudge such instants by one second
 * (00:00:01Z) — invisible at HH:mm precision but no longer the exact sentinel.
 */
export const buildLocalDateTime = (
  dateStr: string,
  timeStr: string
): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') || !isValidClockTime(timeStr)) {
    return null;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    d.setUTCSeconds(1);
  }
  return d;
};

/**
 * Extract the LOCAL calendar date ("YYYY-MM-DD") from a stored timestamp.
 *
 * Counterpart to timeFromStoredTimestamp: the Mark Attendance modal shows times
 * in local tz, so the date it pairs them with must be local too. Using
 * `.toISOString()` (UTC) here instead put the check-in / check-out date a day off
 * whenever the local time sits near the UTC boundary — which wrongly flipped
 * `useSeparateCheckOutDate` on and saved the check-out against the wrong day,
 * dropping it into the 00:00–05:30 IST band. Keeping the date local matches how
 * the time is rendered so the round-trip stays stable.
 */
export const dateFromStoredTimestamp = (
  value: string | null | undefined
): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
};

/**
 * Format datetime to readable format
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy HH:mm');
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return formatDateToISO(new Date());
};

/**
 * Get start of current month
 */
export const getStartOfMonth = (date?: Date): string => {
  return formatDateToISO(startOfMonth(date || new Date()));
};

/**
 * Get end of current month
 */
export const getEndOfMonth = (date?: Date): string => {
  return formatDateToISO(endOfMonth(date || new Date()));
};

/**
 * Get month and year from date
 */
export const getMonthYear = (date: Date | string): { month: number; year: number } => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return {
    month: d.getMonth(), // 0-indexed
    year: d.getFullYear(),
  };
};

/**
 * Calculate total days between two dates (inclusive)
 */
export const calculateTotalDays = (startDate: string, endDate: string): number => {
  return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
};

/**
 * Format month name from month number (0-indexed)
 */
export const formatMonthName = (month: number, year: number): string => {
  const date = new Date(year, month, 1);
  return format(date, 'MMMM yyyy');
};

/**
 * Get previous month
 */
export const getPreviousMonth = (month: number, year: number): { month: number; year: number } => {
  const date = subMonths(new Date(year, month, 1), 1);
  return getMonthYear(date);
};

/**
 * Get next month
 */
export const getNextMonth = (month: number, year: number): { month: number; year: number } => {
  const date = addMonths(new Date(year, month, 1), 1);
  return getMonthYear(date);
};

/**
 * Format date (alias for formatDateToReadable for consistency)
 */
export const formatDate = (date: Date | string): string => {
  return formatDateToReadable(date);
};

/**
 * Format date to short format without year (e.g., Nov 10)
 */
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d');
};

/**
 * Format a timestamp as a short relative time (e.g. "Just now", "5m ago",
 * "2h ago", "3d ago"). Falls back to an absolute date for older items.
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
};

/**
 * Get first day of month
 */
export const getFirstDayOfMonth = (date: Date): Date => {
  return startOfMonth(date);
};

/**
 * Get last day of month
 */
export const getLastDayOfMonth = (date: Date): Date => {
  return endOfMonth(date);
};
