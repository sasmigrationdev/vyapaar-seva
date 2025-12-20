import { supabase } from '@/lib/supabase/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';

/**
 * Interface for attendance report data
 */
export interface GeneralNote {
  date: string;
  sortDate: Date;
  type: 'leave_pending' | 'leave_rejected' | 'leave_cancelled' | 'salary_change' | 'attendance_note';
  title: string;
  details: string;
}

export interface AttendanceReportData {
  employee: {
    name: string;
    employeeId: string;
    phone: string;
    hourlyRate: number;
    aadhaarNumber?: string;
  };
  period: {
    month: number;
    year: number;
    monthName: string;
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
    totalHours: number;
  };
  dailyAttendance: Array<{
    date: string;
    dayName: string;
    status: 'P' | 'A' | 'WO';
    hours?: number;
    overtimeHours?: number;
  }>;
  generalNotes: GeneralNote[];
}

/**
 * Fetch attendance report data for a user and month
 */
export async function fetchAttendanceReportData(
  userId: string,
  month: number,
  year: number,
  endDay?: number // Optional: if provided, only include data up to this day
): Promise<AttendanceReportData> {
  // Fetch user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('employee_id, full_name, phone, hourly_rate, working_days, aadhaar_number')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // Calculate date range
  const startDate = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const actualEndDay = endDay && endDay <= lastDayOfMonth ? endDay : lastDayOfMonth;
  const endDate = new Date(year, month - 1, actualEndDay);
  const totalDaysInMonth = actualEndDay;
  const startDateStr = formatDateLocal(year, month, 1);
  const endDateStr = formatDateLocal(year, month, actualEndDay);

  // Fetch attendance records for the date range
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (attendanceError) throw attendanceError;

  // Fetch non-approved leave requests that overlap with the report period
  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'approved')
    .lte('start_date', endDateStr)
    .gte('end_date', startDateStr);

  // Fetch salary history changes within the report period
  const { data: salaryChanges } = await supabase
    .from('salary_history')
    .select('*')
    .eq('user_id', userId)
    .gte('effective_from', startDateStr)
    .lte('effective_from', endDateStr)
    .order('effective_from', { ascending: true });

  // Calculate total hours worked from attendance records
  const totalHoursWorked = attendanceRecords?.reduce((sum, record) => {
    return sum + (Number(record.total_hours) || 0);
  }, 0) || 0;

  // Calculate attendance summary
  const presentDays = attendanceRecords?.length || 0;

  // Count working days in the date range based on user's working_days
  const workingDaysInRange = calculateWorkingDaysInRange(
    year,
    month,
    actualEndDay,
    user.working_days || []
  );

  const absentDays = workingDaysInRange - presentDays;

  // Calculate expected hours (working days * 8 hours)
  const expectedHours = workingDaysInRange * 8;

  // Calculate earned salary based on actual hours worked
  const hourlyRate = Number(user.hourly_rate) || 0;
  const earnedSalary = totalHoursWorked * hourlyRate;

  // Generate daily attendance calendar
  const dailyAttendance: AttendanceReportData['dailyAttendance'] = [];
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
      const totalHours = Number(attendance.total_hours) || 0;
      const overtimeHours = Number(attendance.overtime_hours) || 0;
      dailyAttendance.push({
        date: dateStr,
        dayName,
        status: 'P',
        hours: totalHours - overtimeHours, // Regular hours only
        overtimeHours: overtimeHours > 0 ? overtimeHours : undefined,
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

  const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });

  // Build general notes array
  const generalNotes: GeneralNote[] = [];

  // Add non-approved leave requests (pending, rejected, cancelled)
  if (leaveRequests && leaveRequests.length > 0) {
    leaveRequests.forEach((leave) => {
      const startDateFormatted = new Date(leave.start_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      const endDateFormatted = new Date(leave.end_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      const leaveType = leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1);

      // Determine type and title based on status
      const statusType = leave.status === 'pending' ? 'leave_pending' :
                         leave.status === 'rejected' ? 'leave_rejected' : 'leave_cancelled';
      const statusLabel = leave.status === 'pending' ? 'Pending' :
                          leave.status === 'rejected' ? 'Rejected' : 'Cancelled';

      generalNotes.push({
        date: leave.created_at ? new Date(leave.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }) : startDateFormatted,
        sortDate: leave.created_at ? new Date(leave.created_at) : new Date(leave.start_date),
        type: statusType,
        title: `Leave ${statusLabel}`,
        details: `${leaveType}: ${startDateFormatted} - ${endDateFormatted} (${leave.total_days}d)${leave.reason ? ` • ${leave.reason}` : ''}`,
      });
    });
  }

  // Add salary history changes
  if (salaryChanges && salaryChanges.length > 0) {
    salaryChanges.forEach((change) => {
      const effectiveDate = new Date(change.effective_from).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });

      const changes: string[] = [];

      if (change.old_salary !== null && change.new_salary !== null && change.old_salary !== change.new_salary) {
        changes.push(`₹${Number(change.old_salary).toLocaleString()} → ₹${Number(change.new_salary).toLocaleString()}`);
      }

      if (change.old_working_days && change.new_working_days &&
          JSON.stringify(change.old_working_days) !== JSON.stringify(change.new_working_days)) {
        const formatDays = (days: string[]) => days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(',');
        changes.push(`Days: ${formatDays(change.old_working_days)} → ${formatDays(change.new_working_days)}`);
      }

      if (change.old_daily_working_hours !== null && change.new_daily_working_hours !== null &&
          change.old_daily_working_hours !== change.new_daily_working_hours) {
        changes.push(`${change.old_daily_working_hours}h → ${change.new_daily_working_hours}h`);
      }

      if (change.old_hourly_rate !== null && change.new_hourly_rate !== null &&
          change.old_hourly_rate !== change.new_hourly_rate) {
        changes.push(`Rate: ₹${Number(change.old_hourly_rate).toFixed(0)} → ₹${Number(change.new_hourly_rate).toFixed(0)}`);
      }

      if (changes.length > 0) {
        let details = changes.join(' • ');
        if (change.change_reason) {
          details += ` (${change.change_reason})`;
        }

        generalNotes.push({
          date: effectiveDate,
          sortDate: new Date(change.effective_from),
          type: 'salary_change',
          title: 'Salary/Schedule Updated',
          details,
        });
      }
    });
  }

  // Add HR attendance notes (filter out self-generated notes)
  const selfGeneratedPatterns = [
    'self check-in',
    'self check-out',
    'wifi verified',
    'auto',
  ];

  attendanceRecords?.forEach((record) => {
    if (record.notes && record.notes.trim()) {
      const noteLower = record.notes.toLowerCase();
      const isSelfGenerated = selfGeneratedPatterns.some(pattern =>
        noteLower.startsWith(pattern) || noteLower.includes(pattern)
      );

      if (!isSelfGenerated) {
        const recordDate = new Date(record.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        });

        generalNotes.push({
          date: recordDate,
          sortDate: new Date(record.date),
          type: 'attendance_note',
          title: 'Attendance Note',
          details: record.notes,
        });
      }
    }
  });

  // Sort notes by date (newest first)
  generalNotes.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  return {
    employee: {
      name: user.full_name,
      employeeId: user.employee_id || 'N/A',
      phone: user.phone || 'N/A',
      hourlyRate: Number(user.hourly_rate) || 0,
      aadhaarNumber: user.aadhaar_number || undefined,
    },
    period: {
      month,
      year,
      monthName: `${monthName} ${year}`,
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
      totalHours: totalHoursWorked,
      expectedHours: expectedHours,
      earnedSalary: earnedSalary,
    },
    attendance: {
      present: presentDays,
      absent: absentDays,
      totalHours: totalHoursWorked,
    },
    dailyAttendance,
    generalNotes,
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
 * Format decimal hours to readable format (e.g., "2h 24m")
 */
function formatHoursReadable(decimalHours: number): string {
  if (!decimalHours || decimalHours === 0) return '0m';

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
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
 * Calculate working days in a date range based on working_days array
 */
function calculateWorkingDaysInRange(
  year: number,
  month: number,
  endDay: number,
  workingDays: string[]
): number {
  if (!workingDays || workingDays.length === 0) return 0;

  let workingDaysCount = 0;

  for (let day = 1; day <= endDay; day++) {
    const date = new Date(year, month - 1, day);
    const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (workingDays.includes(dayKey)) {
      workingDaysCount++;
    }
  }

  return workingDaysCount;
}

/**
 * Get logo URL from Supabase storage
 */
function getLogoUrl(): string {
  return 'https://yardyctualuppxckvobx.supabase.co/storage/v1/object/public/assets/logo.png';
}

/**
 * Generate HTML for attendance report
 */
function generateAttendanceReportHTML(data: AttendanceReportData): string {
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
        currentWeek.push('<td style="padding: 8px; border: 1px solid #333333;"></td>');
      }
    }

    const dateNum = new Date(day.date).getDate();
    const monthStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short' });
    const isSunday = dayOfWeek === 0;
    const sundayStyle = isSunday ? 'color: #EF4444;' : '';

    let cellContent = '';
    if (day.status === 'P' && (day.hours || day.hours === 0)) {
      const hours = Math.floor(day.hours);
      const minutes = Math.round((day.hours - hours) * 60);
      let hoursDisplay = `${hours}:${String(minutes).padStart(2, '0')}`;

      // Add overtime if present
      if (day.overtimeHours && day.overtimeHours > 0) {
        const otHours = Math.floor(day.overtimeHours);
        const otMinutes = Math.round((day.overtimeHours - otHours) * 60);
        const otDisplay = otMinutes > 0 ? `${otHours}:${String(otMinutes).padStart(2, '0')}` : `${otHours}:00`;
        hoursDisplay += `<br/><span style="color: #8B5CF6; font-size: 8px;">+${otDisplay} OT</span>`;
      }

      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 9px; ${sundayStyle}">${hoursDisplay}</span>`;
    } else if (day.status === 'A') {
      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 9px; ${sundayStyle}">Ab.</span>`;
    } else if (day.status === 'WO') {
      cellContent = `<strong style="${sundayStyle}">${dateNum} ${monthStr}</strong><br/><span style="font-size: 9px; ${sundayStyle}">Week Off</span>`;
    }

    currentWeek.push(`
      <td style="padding: 8px; border: 1px solid #333333; text-align: center; font-size: 11px;">
        ${cellContent}
      </td>
    `);

    // Complete week on Sunday
    if (dayOfWeek === 0 || index === data.dailyAttendance.length - 1) {
      // Fill remaining cells
      while (currentWeek.length < 7) {
        currentWeek.push('<td style="padding: 8px; border: 1px solid #333333;"></td>');
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
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Calibri', 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
        }

        /* Company Name */
        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 20px;
          text-align: center;
        }

        /* Content */
        .content {
          background-color: white;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
        }

        h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #0F172A;
        }
        h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 10px;
          color: #0F172A;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .info-item {
          font-size: 12px;
        }
        .info-label {
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          padding: 8px 6px;
          text-align: left;
          border: 1px solid #333333;
          font-size: 10pt;
          color: #000000;
        }
        th {
          background-color: white;
          font-weight: normal;
          font-size: 10pt;
          text-align: center;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 20px 0;
        }
        .summary-item {
          padding: 10px;
          border: 1px solid #333333;
          text-align: center;
        }
        .summary-label {
          font-size: 11px;
          color: #64748b;
        }
        .summary-value {
          font-size: 16px;
          font-weight: 600;
          margin-top: 4px;
        }

        .calendar-header th {
          background-color: #6366f1;
          color: white;
          text-align: center;
          padding: 8px;
        }

        /* General Notes Section - Compact */
        .notes-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 8px;
        }
        .notes-table th {
          background-color: #F1F5F9;
          padding: 4px 6px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #E2E8F0;
        }
        .notes-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }
        .notes-table tr:last-child td {
          border-bottom: none;
        }
        .note-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .note-badge-leave-pending { background-color: #FEF3C7; color: #D97706; }
        .note-badge-leave-rejected { background-color: #FEE2E2; color: #DC2626; }
        .note-badge-leave-cancelled { background-color: #F1F5F9; color: #64748B; }
        .note-badge-salary { background-color: #DBEAFE; color: #2563EB; }
        .note-badge-attendance { background-color: #F3E8FF; color: #7C3AED; }
        .note-details {
          color: #334155;
          max-width: 400px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div class="company-name">SAS Migration</div>

      <div class="content">
        <div class="container">
          <h1>Attendance Report - ${data.period.monthName}</h1>

          <div class="header-info">
            <div class="info-item">
              <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${data.employee.name}</div>
              ${data.employee.aadhaarNumber ? `<div style="font-size: 14px;"><span class="info-label">Aadhaar:</span> ${data.employee.aadhaarNumber}</div>` : ''}
            </div>
            <div class="info-item">
              <div style="font-size: 11px;"><span class="info-label">Phone:</span> ${data.employee.phone}</div>
              <div style="font-size: 11px;"><span class="info-label">Hourly Rate:</span> ₹${Math.round(data.employee.hourlyRate)}</div>
            </div>
          </div>

          <h2>Salary Summary</h2>
          <table>
            <tbody>
              <tr>
                <td><strong>Total Amount</strong></td>
                <td style="text-align: right;"><strong>₹${Math.round(data.earnings.earnedSalary)}</strong></td>
              </tr>
              <tr>
                <td><strong>Hours Worked</strong></td>
                <td style="text-align: right;">${formatHoursReadable(data.earnings.totalHours)}</td>
              </tr>
              <tr>
                <td><strong>Expected Working Hours</strong></td>
                <td style="text-align: right;">${formatHoursReadable(data.earnings.expectedHours)}</td>
              </tr>
            </tbody>
          </table>

          <h2>Attendance Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Present Days</div>
              <div class="summary-value">${data.attendance.present}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Absent Days</div>
              <div class="summary-value">${data.attendance.absent}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Hours</div>
              <div class="summary-value">${formatHoursReadable(data.attendance.totalHours)}</div>
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

          ${data.generalNotes.length > 0 ? `
          <h2>General Notes</h2>
          <table class="notes-table">
            <thead>
              <tr>
                <th style="width: 65px;">Date</th>
                <th style="width: 70px;">Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${data.generalNotes.map(note => {
                const badgeClass = note.type === 'leave_pending' ? 'note-badge-leave-pending' :
                                   note.type === 'leave_rejected' ? 'note-badge-leave-rejected' :
                                   note.type === 'leave_cancelled' ? 'note-badge-leave-cancelled' :
                                   note.type === 'salary_change' ? 'note-badge-salary' :
                                   'note-badge-attendance';
                const shortTitle = note.type === 'leave_pending' ? 'Pending' :
                                   note.type === 'leave_rejected' ? 'Rejected' :
                                   note.type === 'leave_cancelled' ? 'Cancelled' :
                                   note.type === 'salary_change' ? 'Salary' : 'Note';
                return `<tr><td>${note.date}</td><td><span class="note-badge ${badgeClass}">${shortTitle}</span></td><td class="note-details">${note.details}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and download attendance report as PDF
 */
export async function downloadAttendanceReport(
  userId: string,
  month: number,
  year: number,
  endDay?: number // Optional: if provided, only include data up to this day
): Promise<void> {
  try {
    // Fetch data
    const data = await fetchAttendanceReportData(userId, month, year, endDay);

    // Generate HTML
    const html = generateAttendanceReportHTML(data);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Create filename
    const monthName = data.period.monthName.replace(/\s+/g, '_');
    const employeeName = data.employee.name.replace(/\s+/g, '_');
    const fileName = `Attendance_Report_${employeeName}_${monthName}.pdf`;

    // Save to device
    if (Platform.OS === 'android') {
      try {
        // Try to save to Downloads using MediaLibrary
        // Note: This only works in development builds, not in Expo Go
        const { status } = await MediaLibrary.requestPermissionsAsync(false);

        if (status === 'granted') {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync('Download', asset, false);

          Alert.alert(
            'Success',
            `Attendance report has been downloaded to your device.\n\nFile: ${fileName}`,
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (error) {
        // MediaLibrary not available (Expo Go) or permission error
        console.log('MediaLibrary not available, using share instead:', error);
      }

      // Fall back to share dialog
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Attendance Report - ${data.employee.name} - ${data.period.monthName}`,
      });
    } else if (Platform.OS === 'ios') {
      // For iOS, use share sheet
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Attendance Report - ${data.employee.name} - ${data.period.monthName}`,
      });
    }
  } catch (error) {
    console.error('Error generating attendance report:', error);
    throw error;
  }
}

/**
 * Get available months for attendance reports for a user
 * Only returns completed months (excludes current month)
 */
export async function getAvailableAttendanceMonths(userId: string): Promise<
  Array<{
    month: number;
    year: number;
    monthName: string;
    totalHours: number;
  }>
> {
  const { data, error } = await supabase
    .from('employee_monthly_earnings')
    .select('month, year, total_hours_worked')
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
    filteredData?.map((record) => {
      const monthName = new Date(record.year, record.month - 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      return {
        month: record.month,
        year: record.year,
        monthName,
        totalHours: Number(record.total_hours_worked) || 0,
      };
    }) || []
  );
}
