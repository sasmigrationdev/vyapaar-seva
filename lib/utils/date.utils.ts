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
