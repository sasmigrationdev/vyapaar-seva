import { supabase } from '@/lib/supabase/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Interface for salary slip data
 */
export interface SalarySlipData {
  employee: {
    name: string;
    employeeId: string;
    phone: string;
    hourlyRate: number;
    aadhaarNumber?: string;
    rateChangeNote?: string;
  };
  organization: {
    name: string;
  };
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  earnings: {
    totalHours: number;
    expectedHours: number;
    earnedSalary: number;
  };
  attendance: {
    present: number;
    absent: number;
    leaves: number;
    totalHours: number;
  };
  dailyAttendance: Array<{
    date: string;
    dayName: string;
    status: 'P' | 'A' | 'HD' | 'WO' | 'PCO' | 'HDCO';
    hours?: number;
  }>;
  previousBalance?: number;
}

/**
 * Fetch salary slip data for a user and month
 */
export async function fetchSalarySlipData(
  userId: string,
  month: number,
  year: number
): Promise<SalarySlipData> {
  // Fetch user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('employee_id, full_name, phone, hourly_rate, organization_id, working_days, aadhaar_number')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // Organization name (hardcoded)
  const organizationName = 'SAS Migration';

  // Fetch monthly earnings
  const { data: earnings, error: earningsError } = await supabase
    .from('employee_monthly_earnings')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .single();

  // If no earnings record exists, throw a user-friendly error
  if (earningsError && earningsError.code !== 'PGRST116') throw earningsError;
  if (!earnings) {
    throw new Error('No salary data found for this month. Please ensure the month has ended and salary has been calculated.');
  }

  // Calculate date range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const totalDaysInMonth = endDate.getDate();
  const startDateStr = formatDateLocal(year, month, 1);
  const endDateStr = formatDateLocal(year, month, totalDaysInMonth);

  // Fetch attendance records for the month
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (attendanceError) throw attendanceError;

  // Get previous month balance (if exists)
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const { data: previousEarnings } = await supabase
    .from('employee_monthly_earnings')
    .select('earned_salary')
    .eq('user_id', userId)
    .eq('month', previousMonth)
    .eq('year', previousYear)
    .single();

  // Check if there were rate changes during the month
  const { data: salaryHistory } = await supabase
    .from('salary_history')
    .select('effective_from, new_hourly_rate, old_hourly_rate')
    .eq('user_id', userId)
    .gte('effective_from', startDateStr)
    .lte('effective_from', endDateStr)
    .order('effective_from', { ascending: true });

  // Calculate effective hourly rate (weighted average if rate changed mid-month)
  let effectiveHourlyRate = Number(user.hourly_rate) || 0;
  let rateChangeNote: string | undefined;

  if (salaryHistory && salaryHistory.length > 0) {
    // Calculate weighted average based on actual hours worked
    const totalHours = Number(earnings.total_hours_worked) || 0;
    const totalEarned = Number(earnings.earned_salary) || 0;

    if (totalHours > 0 && totalEarned > 0) {
      effectiveHourlyRate = totalEarned / totalHours;
      const changeDate = new Date(salaryHistory[0].effective_from);
      rateChangeNote = `Weighted average (rate changed on ${changeDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`;
    }
  }

  // Calculate attendance summary
  const presentDays = attendanceRecords?.length || 0;

  // Count working days in month based on user's working_days
  const workingDaysInMonth = calculateWorkingDaysInMonth(
    year,
    month,
    user.working_days || []
  );

  const absentDays = workingDaysInMonth - presentDays;

  // Generate daily attendance calendar
  const dailyAttendance: SalarySlipData['dailyAttendance'] = [];
  const attendanceMap = new Map(
    attendanceRecords?.map((record) => [record.date, record]) || []
  );

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = formatDateLocal(year, month, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const attendance = attendanceMap.get(dateStr);
    const isWorkingDay = user.working_days?.includes(dayKey);

    if (attendance) {
      dailyAttendance.push({
        date: dateStr,
        dayName,
        status: 'P',
        hours: Number(attendance.total_hours) || 0,
      });
    } else if (!isWorkingDay) {
      dailyAttendance.push({
        date: dateStr,
        dayName,
        status: 'WO', // Weekly Off
      });
    } else {
      dailyAttendance.push({
        date: dateStr,
        dayName,
        status: 'A', // Absent
      });
    }
  }

  return {
    employee: {
      name: user.full_name,
      employeeId: user.employee_id || '',
      phone: user.phone || 'N/A',
      hourlyRate: effectiveHourlyRate,
      aadhaarNumber: user.aadhaar_number || undefined,
      rateChangeNote,
    },
    organization: {
      name: organizationName,
    },
    period: {
      month,
      year,
      startDate: startDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      endDate: endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    },
    earnings: {
      totalHours: Number(earnings.total_hours_worked) || 0,
      expectedHours: Number(earnings.expected_hours) || 0,
      earnedSalary: Number(earnings.earned_salary) || 0,
    },
    attendance: {
      present: presentDays,
      absent: absentDays,
      leaves: 0, // TODO: Implement leaves tracking
      totalHours: Number(earnings.total_hours_worked) || 0,
    },
    dailyAttendance,
    previousBalance: previousEarnings ? Number(previousEarnings.earned_salary) : 0,
  };
}

/**
 * Format date to YYYY-MM-DD without timezone issues
 */
function formatDateLocal(year: number, month: number, day: number): string {
  const yyyy = year;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate working days in a month based on working_days array
 */
function calculateWorkingDaysInMonth(
  year: number,
  month: number,
  workingDays: string[]
): number {
  if (!workingDays || workingDays.length === 0) return 0;

  const totalDays = new Date(year, month, 0).getDate();
  let workingDaysCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (workingDays.includes(dayKey)) {
      workingDaysCount++;
    }
  }

  return workingDaysCount;
}

/**
 * Generate HTML for salary slip
 */
function generateSalarySlipHTML(data: SalarySlipData): string {
  const logoUrl = 'https://yardyctualuppxckvobx.supabase.co/storage/v1/object/public/assets/logo.png';

  // Generate calendar HTML
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  data.dailyAttendance.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    // Start a new week on Monday
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    // Add empty cells for the first week
    if (index === 0 && dayOfWeek !== 1) {
      const emptyCells = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      for (let i = 0; i < emptyCells; i++) {
        currentWeek.push('<td class="calendar-cell"></td>');
      }
    }

    const dateNum = new Date(day.date).getDate();
    const dateStr = String(dateNum).padStart(2, '0');
    const monthStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short' });
    const isSunday = dayOfWeek === 0;
    const sundayStyle = isSunday ? 'color: #EF4444;' : '';

    let cellContent = '';
    if (day.status === 'P' && day.hours) {
      const hours = Math.floor(day.hours);
      const minutes = Math.round((day.hours - hours) * 60);
      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 8px; ${sundayStyle}">${hours}:${String(minutes).padStart(2, '0')}</span>`;
    } else if (day.status === 'A') {
      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 8px; ${sundayStyle}">Ab.</span>`;
    } else if (day.status === 'WO') {
      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 8px; ${sundayStyle}">WO</span>`;
    }

    currentWeek.push(`
      <td class="calendar-cell" style="text-align: center;">
        ${cellContent}
      </td>
    `);

    // Complete week on Sunday
    if (dayOfWeek === 0 || index === data.dailyAttendance.length - 1) {
      // Fill remaining cells
      while (currentWeek.length < 7) {
        currentWeek.push('<td class="calendar-cell"></td>');
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const calendarRows = weeks.map(week => `<tr>${week.join('')}</tr>`).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 12px; font-size: 11px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo-container { display: inline-block; background-color: white; padding: 10px; margin-bottom: 10px; }
        .logo { width: 80px; height: 80px; object-fit: contain; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 8px; text-align: center; }
        h2 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 6px; }
        .info-item { font-size: 11px; }
        .info-label { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        th, td { padding: 6px; text-align: left; border: 1px solid #e2e8f0; font-size: 10px; }
        th { background-color: #f8fafc; font-weight: 600; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0; }
        .summary-item { padding: 6px; border: 1px solid #e2e8f0; text-align: center; }
        .summary-label { font-size: 9px; color: #64748b; }
        .summary-value { font-size: 13px; font-weight: 600; margin-top: 2px; }
        .total-row { font-weight: 700; background-color: #f8fafc; }
        .calendar-header th { background-color: #6366f1; color: white; text-align: center; padding: 4px; font-size: 9px; }
        .calendar-cell { padding: 4px; font-size: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="${logoUrl}" alt="Logo" class="logo" />
          </div>
          <h1>SAS MIGRATION GROUP</h1>
        </div>
        <h2>Salary Slip (${data.period.startDate} - ${data.period.endDate})</h2>

        <div class="header-info">
          <div class="info-item">
            <div style="font-size: 14px; font-weight: 700;">${data.employee.name}</div>
            ${data.employee.aadhaarNumber ? `<div style="font-size: 11px;">Aadhaar: ${data.employee.aadhaarNumber}</div>` : ''}
          </div>
          <div class="info-item">
            <div style="font-size: 10px;"><span class="info-label">Phone</span> ${data.employee.phone}</div>
            <div style="font-size: 10px;"><span class="info-label">Hourly Rate</span> ₹ ${Math.round(data.employee.hourlyRate)}${data.employee.rateChangeNote ? ` <span style="font-size: 8px; color: #64748b;">${data.employee.rateChangeNote}</span>` : ''}</div>
          </div>
        </div>

        <h2>Payment & Salary</h2>
        <table>
          <tbody>
            <tr>
              <td><strong>Total Amount</strong></td>
              <td style="text-align: right;"><strong>₹ ${Math.round(data.earnings.earnedSalary)}</strong></td>
            </tr>
            <tr>
              <td><strong>Hours Worked</strong></td>
              <td style="text-align: right;">${Math.round(data.earnings.totalHours)} hrs</td>
            </tr>
            <tr>
              <td><strong>Expected Working Hours</strong></td>
              <td style="text-align: right;">${Math.round(data.earnings.expectedHours)} hrs</td>
            </tr>
          </tbody>
        </table>

        <h2>Misc Allowance</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2" style="text-align: center; color: #64748b; font-style: italic;">No allowances for this month</td>
            </tr>
          </tbody>
        </table>

        <h2>Net Payable</h2>
        <table>
          <tbody>
            <tr class="total-row">
              <td><strong>Total Payable (Salary + Allowances)</strong></td>
              <td style="text-align: right;"><strong>₹ ${data.earnings.earnedSalary.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <h2>Attendance Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Present</div>
            <div class="summary-value">${data.attendance.present}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Absent</div>
            <div class="summary-value">${data.attendance.absent}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Leaves</div>
            <div class="summary-value">${data.attendance.leaves}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Hours</div>
            <div class="summary-value">${Math.round(data.attendance.totalHours)}</div>
          </div>
        </div>

        <h2>Monthly Calendar</h2>
        <table>
          <thead>
            <tr class="calendar-header">
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
              <th>Sun</th>
            </tr>
          </thead>
          <tbody>
            ${calendarRows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and download salary slip as PDF
 */
export async function downloadSalarySlip(
  userId: string,
  month: number,
  year: number
): Promise<void> {
  try {
    // Fetch data
    const data = await fetchSalarySlipData(userId, month, year);

    // Generate HTML
    const html = generateSalarySlipHTML(data);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Create filename
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
    const employeeName = data.employee.name.replace(/\s+/g, '_');
    const fileName = `Salary_Slip_${employeeName}_${monthName}_${year}.pdf`;

    // Save to device via share sheet
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Salary Slip - ${data.employee.name} - ${data.period.startDate}`,
    });
  } catch (error) {
    console.error('Error generating salary slip:', error);
    throw error;
  }
}

/**
 * Get available months for salary slips for a user
 * Only returns completed months (excludes current month)
 */
export async function getAvailableMonths(userId: string): Promise<
  Array<{
    month: number;
    year: number;
    totalHours: number;
    earnedSalary: number;
  }>
> {
  const { data, error } = await supabase
    .from('employee_monthly_earnings')
    .select('month, year, total_hours_worked, earned_salary')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-11, we need 1-12
  const currentYear = now.getFullYear();

  // Filter out current month - only show completed months
  const filteredData = data?.filter((record) => {
    // Show if year is before current year
    if (record.year < currentYear) return true;

    // If same year, only show months before current month
    if (record.year === currentYear && record.month < currentMonth) return true;

    // Hide current month and future months
    return false;
  });

  return (
    filteredData?.map((record) => ({
      month: record.month,
      year: record.year,
      totalHours: Number(record.total_hours_worked) || 0,
      earnedSalary: Number(record.earned_salary) || 0,
    })) || []
  );
}
