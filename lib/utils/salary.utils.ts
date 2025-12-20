/**
 * Calculate total salary
 */
export const calculateTotalSalary = (
  baseSalary: number,
  allowances: number = 0,
  bonus: number = 0,
  deductions: number = 0
): number => {
  return baseSalary + allowances + bonus - deductions;
};

/**
 * Calculate pro-rated salary based on present days
 */
export const calculateProRatedSalary = (
  baseSalary: number,
  workingDays: number,
  presentDays: number,
  allowances: number = 0,
  bonus: number = 0,
  deductions: number = 0
): number => {
  const dailySalary = baseSalary / workingDays;
  const earnedSalary = dailySalary * presentDays;
  return earnedSalary + allowances + bonus - deductions;
};

/**
 * Format currency (INR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Calculate earned salary based on hours worked
 */
export const calculateEarnedSalary = (
  hoursWorked: number,
  hourlyRate: number
): number => {
  return hoursWorked * hourlyRate;
};

/**
 * Calculate salary progress percentage
 */
export const calculateSalaryProgress = (
  earnedSalary: number,
  baseSalary: number
): number => {
  if (baseSalary === 0) return 0;
  return Math.min(Math.round((earnedSalary / baseSalary) * 100), 100);
};

/**
 * Calculate hours progress percentage
 */
export const calculateHoursProgress = (
  workedHours: number,
  expectedHours: number
): number => {
  if (expectedHours === 0) return 0;
  return Math.min(Math.round((workedHours / expectedHours) * 100), 100);
};

/**
 * Format hours display (e.g., "8h" or "40h")
 */
export const formatHours = (hours: number, decimals: number = 1): string => {
  return `${Math.round(hours)}h`;
};
