import { differenceInHours, differenceInMinutes, differenceInDays, parseISO, startOfDay, subDays } from 'date-fns';
import { AttendanceBreak, AttendanceRecord } from '@/lib/types';

/**
 * Calculate total hours worked (without break deduction)
 * Optionally includes overtime hours
 */
export const calculateTotalHours = (checkInTime: string, checkOutTime: string, overtimeHours?: number): number => {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const totalMinutes = differenceInMinutes(checkOut, checkIn);
  const hours = Math.round(totalMinutes / 60);
  const overtime = overtimeHours || 0;
  return hours + overtime;
};

/**
 * Parse breaks from JSONB (Json type) to typed AttendanceBreak array
 */
export const parseBreaks = (breaksJson: any): AttendanceBreak[] => {
  if (!breaksJson) return [];
  if (Array.isArray(breaksJson)) return breaksJson as AttendanceBreak[];
  return [];
};

/**
 * Calculate total break hours from breaks array
 */
export const calculateBreakHours = (breaks: AttendanceBreak[]): number => {
  if (!breaks || breaks.length === 0) return 0;
  const totalMinutes = breaks.reduce((sum, brk) => sum + (brk.duration_minutes || 0), 0);
  return Math.round(totalMinutes / 60);
};

/**
 * Calculate net working hours (total hours - breaks)
 */
export const calculateNetHours = (
  checkInTime: string,
  checkOutTime: string,
  breaks: AttendanceBreak[]
): number => {
  const grossHours = calculateTotalHours(checkInTime, checkOutTime);
  const breakHours = calculateBreakHours(breaks);
  return Math.max(0, grossHours - breakHours);
};

/**
 * Calculate break duration in minutes between two times
 */
export const calculateBreakDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const minutes = differenceInMinutes(end, start);
  return Math.max(0, minutes);
};

/**
 * Validate break time is within check-in and check-out period
 */
export const validateBreakTime = (
  breakStartTime: string,
  breakEndTime: string,
  checkInTime: string,
  checkOutTime: string
): { valid: boolean; error?: string } => {
  const breakStart = new Date(breakStartTime);
  const breakEnd = new Date(breakEndTime);
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);

  // Break end must be after break start
  if (breakEnd <= breakStart) {
    return { valid: false, error: 'Break end time must be after start time' };
  }

  // Break must be within check-in and check-out times
  if (breakStart < checkIn) {
    return { valid: false, error: 'Break cannot start before check-in time' };
  }

  if (breakEnd > checkOut) {
    return { valid: false, error: 'Break cannot end after check-out time' };
  }

  return { valid: true };
};

/**
 * Format hours to readable string (e.g., "8h 30m" or just "30m")
 */
export const formatHours = (hours: number): string => {
  if (!hours) return '0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  // If less than 1 hour, show only minutes
  if (h === 0) {
    return `${m}m`;
  }

  // If exactly on the hour, show only hours
  if (m === 0) {
    return `${h}h`;
  }

  // Show both hours and minutes
  return `${h}h ${m}m`;
};

/**
 * Check if attendance is valid (minimum hours worked)
 */
export const isValidAttendance = (hours: number, minimumHours: number = 6): boolean => {
  return hours >= minimumHours;
};

/**
 * Get attendance status from record
 */
export const getAttendanceStatus = (record: {
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_hours?: number | null;
}): 'Present' | 'Incomplete' | 'Absent' => {
  if (!record.check_in_time) return 'Absent';
  if (!record.check_out_time) return 'Incomplete';
  return 'Present';
};

/**
 * Calculate attendance percentage
 */
export const calculateAttendancePercentage = (presentDays: number, totalDays: number): number => {
  if (totalDays === 0) return 0;
  return Math.round((presentDays / totalDays) * 100);
};

/**
 * Format break summary for display
 */
export const formatBreakSummary = (breaks: AttendanceBreak[]): string => {
  if (!breaks || breaks.length === 0) return 'No breaks';

  const breakCount = breaks.length;
  const totalMinutes = breaks.reduce((sum, brk) => sum + (brk.duration_minutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let summary = `${breakCount} break${breakCount > 1 ? 's' : ''}`;
  if (hours > 0) {
    summary += ` (${hours}h`;
    if (minutes > 0) summary += ` ${minutes}m`;
    summary += ')';
  } else if (minutes > 0) {
    summary += ` (${minutes}m)`;
  }

  return summary;
};

/**
 * Calculate total hours from approved break requests only
 */
export const calculateApprovedBreakHours = (breakRequests: any[]): number => {
  if (!breakRequests || breakRequests.length === 0) return 0;

  // Filter only completed breaks
  const approvedBreaks = breakRequests.filter(req => req.status === 'completed');

  // Sum up duration_minutes from approved breaks
  const totalMinutes = approvedBreaks.reduce((sum, req) => {
    return sum + (req.duration_minutes || 0);
  }, 0);

  // Convert to hours (rounded)
  return Math.round(totalMinutes / 60);
};

/**
 * Format break duration from break requests for display
 */
export const formatBreakDurationFromRequests = (breakRequests: any[]): string => {
  if (!breakRequests || breakRequests.length === 0) return 'No breaks';

  const approvedBreaks = breakRequests.filter(req => req.status === 'completed');

  if (approvedBreaks.length === 0) return 'No approved breaks';

  const breakCount = approvedBreaks.length;
  const totalMinutes = approvedBreaks.reduce((sum, req) => sum + (req.duration_minutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let summary = `${breakCount} break${breakCount > 1 ? 's' : ''}`;
  if (hours > 0) {
    summary += ` (${hours}h`;
    if (minutes > 0) summary += ` ${minutes}m`;
    summary += ')';
  } else if (minutes > 0) {
    summary += ` (${minutes}m)`;
  }

  return summary;
};

/**
 * Calculate net working hours (total hours - approved break hours)
 */
export const calculateNetHoursWithBreakRequests = (
  totalHours: number,
  breakRequests: any[]
): number => {
  const breakHours = calculateApprovedBreakHours(breakRequests);
  return Math.max(0, totalHours - breakHours);
};

/**
 * Calculate attendance streak from attendance records
 * Returns current streak (consecutive days from today backwards) and longest streak
 */
export const calculateAttendanceStreak = (
  records: Pick<AttendanceRecord, 'date' | 'check_in_time'>[]
): { currentStreak: number; longestStreak: number } => {
  if (!records || records.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Filter records with valid check-in times and sort by date descending
  const validRecords = records
    .filter((r) => r.check_in_time)
    .map((r) => startOfDay(parseISO(r.date)))
    .sort((a, b) => b.getTime() - a.getTime());

  if (validRecords.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Remove duplicates (same day)
  const uniqueDates = validRecords.filter(
    (date, index, arr) =>
      index === 0 || date.getTime() !== arr[index - 1].getTime()
  );

  // Calculate current streak (from today/yesterday backwards)
  let currentStreak = 0;
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  // Check if the most recent record is today or yesterday
  const mostRecent = uniqueDates[0];
  const daysDiff = differenceInDays(today, mostRecent);

  if (daysDiff <= 1) {
    // Start counting from the most recent day
    currentStreak = 1;
    let expectedDate = subDays(mostRecent, 1);

    for (let i = 1; i < uniqueDates.length; i++) {
      const recordDate = uniqueDates[i];
      const diff = differenceInDays(expectedDate, recordDate);

      if (diff === 0) {
        currentStreak++;
        expectedDate = subDays(expectedDate, 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInDays(uniqueDates[i - 1], uniqueDates[i]);

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
};
