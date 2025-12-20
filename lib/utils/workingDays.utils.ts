import { WeekDay } from '@/lib/types';

/**
 * Get day name from date
 */
export const getDayName = (date: Date): WeekDay => {
  const days: WeekDay[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[date.getDay()];
};

/**
 * Check if a date is a working day
 */
export const isWorkingDay = (date: Date, workingDays: WeekDay[]): boolean => {
  const dayName = getDayName(date);
  return workingDays.includes(dayName);
};

/**
 * Check if today is a working day
 */
export const isTodayWorkingDay = (workingDays: WeekDay[]): boolean => {
  return isWorkingDay(new Date(), workingDays);
};

/**
 * Calculate working days in a month
 */
export const calculateWorkingDaysInMonth = (
  workingDays: WeekDay[],
  month: number, // 0-indexed (0 = January)
  year: number
): number => {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (isWorkingDay(date, workingDays)) {
      count++;
    }
  }

  return count;
};

/**
 * Calculate working days in current month
 */
export const calculateWorkingDaysInCurrentMonth = (
  workingDays: WeekDay[]
): number => {
  const now = new Date();
  return calculateWorkingDaysInMonth(workingDays, now.getMonth(), now.getFullYear());
};

/**
 * Calculate monthly total hours
 */
export const calculateMonthlyTotalHours = (
  workingDays: WeekDay[],
  dailyHours: number,
  month: number, // 0-indexed
  year: number
): number => {
  const workingDaysCount = calculateWorkingDaysInMonth(workingDays, month, year);
  return workingDaysCount * dailyHours;
};

/**
 * Calculate monthly total hours for current month
 */
export const calculateCurrentMonthlyTotalHours = (
  workingDays: WeekDay[],
  dailyHours: number
): number => {
  const now = new Date();
  return calculateMonthlyTotalHours(
    workingDays,
    dailyHours,
    now.getMonth(),
    now.getFullYear()
  );
};

/**
 * Calculate average monthly hours across all 12 months
 */
export const calculateAverageMonthlyHours = (
  workingDays: WeekDay[],
  dailyHours: number,
  year?: number
): number => {
  const targetYear = year || new Date().getFullYear();
  let totalHours = 0;

  // Calculate hours for all 12 months
  for (let month = 0; month < 12; month++) {
    const monthlyHours = calculateMonthlyTotalHours(workingDays, dailyHours, month, targetYear);
    totalHours += monthlyHours;
  }

  // Return average
  return totalHours / 12;
};

/**
 * Calculate hourly rate
 */
export const calculateHourlyRate = (
  baseSalary: number,
  totalMonthlyHours: number
): number => {
  if (totalMonthlyHours === 0) return 0;
  return baseSalary / totalMonthlyHours;
};

/**
 * Get weekday display name
 */
export const getWeekdayDisplayName = (day: WeekDay): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

/**
 * Get short weekday display name (3 letters)
 */
export const getWeekdayShortName = (day: WeekDay): string => {
  return getWeekdayDisplayName(day).slice(0, 3);
};

/**
 * Get all weekdays
 */
export const ALL_WEEKDAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Get default working days (Monday to Friday)
 */
export const DEFAULT_WORKING_DAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

/**
 * Format working days for display
 */
export const formatWorkingDays = (workingDays: WeekDay[]): string => {
  if (workingDays.length === 0) return 'No working days';
  if (workingDays.length === 7) return 'All days';

  // Check if it's Mon-Fri
  const isMonToFri =
    workingDays.length === 5 &&
    DEFAULT_WORKING_DAYS.every(day => workingDays.includes(day));

  if (isMonToFri) return 'Mon-Fri';

  // Otherwise show first few days
  if (workingDays.length <= 3) {
    return workingDays.map(getWeekdayShortName).join(', ');
  }

  return `${workingDays.length} days/week`;
};
