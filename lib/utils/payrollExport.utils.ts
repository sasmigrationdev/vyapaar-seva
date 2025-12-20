import { supabase } from "@/lib/supabase/client";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Platform, Alert } from "react-native";
import {
  PayrollPeriod,
  PayrollSalaryRecord,
  PaymentStatus,
} from "../types";
import { formatCurrency, formatPayrollPeriod } from "./payroll.utils";

/**
 * Fetch payroll period with all salary records
 */
async function fetchPayrollPeriodData(periodId: string): Promise<{
  period: PayrollPeriod;
  salaries: PayrollSalaryRecord[];
}> {
  // Fetch period
  const { data: period, error: periodError } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();

  if (periodError) throw periodError;

  // Fetch salary records with user details
  const { data: salaries, error: salariesError } = await supabase
    .from("salary_records")
    .select(
      `
      *,
      users!salary_records_user_id_fkey (
        full_name,
        employee_id,
        department,
        designation,
        account_number,
        ifsc_code
      )
    `
    )
    .eq("payroll_period_id", periodId)
    .order("users(full_name)", { ascending: true });

  if (salariesError) throw salariesError;

  return {
    period,
    salaries: salaries || [],
  };
}

/**
 * Calculate total for a salary record
 */
function calculateTotal(record: PayrollSalaryRecord): number {
  const base = record.base_salary || 0;
  const allowances = record.allowances || 0;
  const bonus = record.bonus || 0;
  const deductions = record.deductions || 0;
  return base + allowances + bonus - deductions;
}

/**
 * Get logo URL from Supabase storage
 */
function getLogoUrl(): string {
  return "https://yardyctualuppxckvobx.supabase.co/storage/v1/object/public/assets/logo.png";
}

/**
 * Generate HTML for bulk salary slips (all employees)
 */
function generateBulkSalarySlipsHTML(
  period: PayrollPeriod,
  salaries: PayrollSalaryRecord[]
): string {
  const logoUrl = getLogoUrl();
  const monthName = formatPayrollPeriod(period.month, period.year);

  // Generate individual salary slips for each employee
  const salarySlips = salaries
    .map((record) => {
      const employee = record.users;
      if (!employee) return "";

      const baseSalary = record.base_salary || 0;
      const allowances = record.allowances || 0;
      const deductions = record.deductions || 0;
      const bonus = record.bonus || 0;
      const gross = baseSalary + allowances + bonus;
      const netSalary = calculateTotal(record);

      return `
      <!-- Page break before each slip except first -->
      <div style="page-break-before: ${salaries[0].id === record.id ? "avoid" : "always"};">
        <!-- Header Strip -->
        <div class="header-strip">
          <div class="header-content">
            <div class="logo-container">
              <div class="logo"><img src="${logoUrl}" alt="Company Logo" /></div>
            </div>
            <div class="company-name">SAS MIGRATION GROUP</div>
          </div>
        </div>

        <!-- Salary Slip Content -->
        <div class="content">
          <div class="slip-container">
            <h1 class="slip-title">Salary Slip</h1>
            <p class="slip-period">${monthName}</p>

            <!-- Employee Details -->
            <table class="details-table">
              <tr>
                <td class="label">Employee Name:</td>
                <td class="value">${employee.full_name}</td>
                <td class="label">Employee ID:</td>
                <td class="value">${employee.employee_id || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">Department:</td>
                <td class="value">${employee.department || "N/A"}</td>
                <td class="label">Designation:</td>
                <td class="value">${employee.designation || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">Pay Period:</td>
                <td class="value">${new Date(period.start_date).toLocaleDateString()} - ${new Date(period.end_date).toLocaleDateString()}</td>
                <td class="label">Payment Status:</td>
                <td class="value status-${record.payment_status}">${record.payment_status.toUpperCase()}</td>
              </tr>
            </table>

            <!-- Earnings & Deductions -->
            <div class="salary-breakdown">
              <div class="earnings-section">
                <h2 class="section-title">Earnings</h2>
                <table class="breakdown-table">
                  <tr>
                    <td class="breakdown-label">Base Salary</td>
                    <td class="breakdown-value">₹${baseSalary.toLocaleString("en-IN")}</td>
                  </tr>
                  ${
                    allowances > 0
                      ? `
                  <tr>
                    <td class="breakdown-label">Allowances</td>
                    <td class="breakdown-value">₹${allowances.toLocaleString("en-IN")}</td>
                  </tr>
                  `
                      : ""
                  }
                  ${
                    bonus > 0
                      ? `
                  <tr>
                    <td class="breakdown-label">Bonus</td>
                    <td class="breakdown-value">₹${bonus.toLocaleString("en-IN")}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr class="total-row">
                    <td class="breakdown-label"><strong>Gross Salary</strong></td>
                    <td class="breakdown-value"><strong>₹${gross.toLocaleString("en-IN")}</strong></td>
                  </tr>
                </table>
              </div>

              <div class="deductions-section">
                <h2 class="section-title">Deductions</h2>
                <table class="breakdown-table">
                  ${
                    deductions > 0
                      ? `
                  <tr>
                    <td class="breakdown-label">Deductions</td>
                    <td class="breakdown-value">₹${deductions.toLocaleString("en-IN")}</td>
                  </tr>
                  `
                      : `
                  <tr>
                    <td class="breakdown-label">No Deductions</td>
                    <td class="breakdown-value">₹0</td>
                  </tr>
                  `
                  }
                  <tr class="total-row">
                    <td class="breakdown-label"><strong>Total Deductions</strong></td>
                    <td class="breakdown-value"><strong>₹${deductions.toLocaleString("en-IN")}</strong></td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Net Salary -->
            <div class="net-salary-box">
              <div class="net-label">Net Salary</div>
              <div class="net-value">₹${netSalary.toLocaleString("en-IN")}</div>
            </div>

            ${
              record.payment_status === "paid" && record.paid_at
                ? `
            <!-- Payment Info -->
            <div class="payment-info">
              <p><strong>Payment Date:</strong> ${new Date(record.paid_at).toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${record.payment_mode?.replace("_", " ").toUpperCase() || "N/A"}</p>
              ${record.payment_reference ? `<p><strong>Reference:</strong> ${record.payment_reference}</p>` : ""}
            </div>
            `
                : ""
            }

            ${
              record.hours_worked !== null && record.expected_hours !== null
                ? `
            <!-- Attendance Info -->
            <div class="attendance-info">
              <p><strong>Hours Worked:</strong> ${record.hours_worked}h / ${record.expected_hours}h</p>
            </div>
            `
                : ""
            }

            ${
              record.notes
                ? `
            <!-- Notes -->
            <div class="notes">
              <p><strong>Notes:</strong> ${record.notes}</p>
            </div>
            `
                : ""
            }

            <!-- Footer -->
            <div class="slip-footer">
              <p>This is a computer-generated document and does not require a signature.</p>
              <p class="generated-date">Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

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
          padding: 0;
        }

        /* Header Strip */
        .header-strip {
          background-color: #B8463D;
          padding: 20px;
          text-align: center;
        }
        .header-content {
          display: inline-block;
          text-align: center;
        }
        .logo-container {
          display: inline-block;
          background-color: white;
          padding: 8px;
          border-radius: 8px;
          margin-right: 15px;
          vertical-align: middle;
        }
        .logo {
          display: inline-block;
          width: 100px;
          height: 100px;
          vertical-align: middle;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .company-name {
          display: inline-block;
          vertical-align: middle;
          color: white;
          font-size: 24pt;
          font-weight: bold;
          letter-spacing: 1px;
        }

        /* Content */
        .content {
          padding: 30px 20px;
          background-color: white;
        }
        .slip-container {
          max-width: 700px;
          margin: 0 auto;
        }
        .slip-title {
          text-align: center;
          font-size: 24pt;
          color: #333;
          margin-bottom: 8px;
        }
        .slip-period {
          text-align: center;
          font-size: 14pt;
          color: #666;
          margin-bottom: 30px;
        }

        /* Details Table */
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .details-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .details-table .label {
          font-weight: bold;
          background-color: #f5f5f5;
          width: 25%;
        }
        .details-table .value {
          width: 25%;
        }
        .status-paid {
          color: #065F46;
          font-weight: bold;
        }
        .status-pending {
          color: #92400E;
          font-weight: bold;
        }

        /* Salary Breakdown */
        .salary-breakdown {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        .earnings-section,
        .deductions-section {
          flex: 1;
        }
        .section-title {
          font-size: 14pt;
          color: #333;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #B8463D;
        }
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
        }
        .breakdown-table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        .breakdown-label {
          background-color: #f9f9f9;
        }
        .breakdown-value {
          text-align: right;
          font-weight: 600;
        }
        .total-row {
          background-color: #f0f0f0;
        }

        /* Net Salary Box */
        .net-salary-box {
          background: linear-gradient(135deg, #B8463D, #D45B51);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 20px;
        }
        .net-label {
          font-size: 14pt;
          margin-bottom: 5px;
        }
        .net-value {
          font-size: 28pt;
          font-weight: bold;
        }

        /* Payment Info */
        .payment-info {
          background-color: #D1FAE5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .payment-info p {
          margin-bottom: 5px;
          color: #065F46;
        }

        /* Attendance Info */
        .attendance-info {
          background-color: #E0E7FF;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .attendance-info p {
          color: #3730A3;
        }

        /* Notes */
        .notes {
          background-color: #FEF3C7;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .notes p {
          color: #92400E;
        }

        /* Footer */
        .slip-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 9pt;
        }
        .generated-date {
          margin-top: 10px;
          font-style: italic;
        }

        @media print {
          .content {
            padding: 20px 10px;
          }
        }
      </style>
    </head>
    <body>
      ${salarySlips}
    </body>
    </html>
  `;
}

/**
 * Generate summary sheet HTML for payroll period
 */
function generatePayrollSummaryHTML(
  period: PayrollPeriod,
  salaries: PayrollSalaryRecord[]
): string {
  const logoUrl = getLogoUrl();
  const monthName = formatPayrollPeriod(period.month, period.year);

  // Calculate totals
  const totalGross = salaries.reduce((sum, r) => {
    const gross =
      (r.base_salary || 0) + (r.allowances || 0) + (r.bonus || 0);
    return sum + gross;
  }, 0);

  const totalDeductions = salaries.reduce(
    (sum, r) => sum + (r.deductions || 0),
    0
  );

  const totalNet = salaries.reduce((sum, r) => sum + calculateTotal(r), 0);

  const paidCount = salaries.filter((r) => r.payment_status === "paid").length;
  const pendingCount = salaries.filter(
    (r) => r.payment_status === "pending"
  ).length;

  // Group by payment status
  const statusGroups: Record<PaymentStatus, number> = {
    pending: 0,
    processing: 0,
    paid: 0,
    failed: 0,
    on_hold: 0,
  };

  salaries.forEach((r) => {
    statusGroups[r.payment_status] += 1;
  });

  // Generate table rows
  const tableRows = salaries
    .map(
      (record, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td>${record.users?.full_name || "N/A"}</td>
      <td style="text-align: center;">${record.users?.employee_id || "N/A"}</td>
      <td style="text-align: right;">₹${(record.base_salary || 0).toLocaleString("en-IN")}</td>
      <td style="text-align: right;">₹${(record.allowances || 0).toLocaleString("en-IN")}</td>
      <td style="text-align: right;">₹${(record.deductions || 0).toLocaleString("en-IN")}</td>
      <td style="text-align: right;">₹${(record.bonus || 0).toLocaleString("en-IN")}</td>
      <td style="text-align: right;"><strong>₹${calculateTotal(record).toLocaleString("en-IN")}</strong></td>
      <td style="text-align: center;">${record.hours_worked || 0}h</td>
      <td style="text-align: center;"><span class="status-${record.payment_status}">${record.payment_status.toUpperCase()}</span></td>
    </tr>
  `
    )
    .join("");

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
          padding: 0;
        }

        .header-strip {
          background-color: #B8463D;
          padding: 20px;
          text-align: center;
        }
        .header-content {
          display: inline-block;
          text-align: center;
        }
        .logo-container {
          display: inline-block;
          background-color: white;
          padding: 8px;
          border-radius: 8px;
          margin-right: 15px;
          vertical-align: middle;
        }
        .logo {
          display: inline-block;
          width: 100px;
          height: 100px;
          vertical-align: middle;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .company-name {
          display: inline-block;
          vertical-align: middle;
          color: white;
          font-size: 24pt;
          font-weight: bold;
        }

        .content {
          padding: 30px 20px;
        }
        .summary-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .title {
          text-align: center;
          font-size: 20pt;
          margin-bottom: 10px;
        }
        .subtitle {
          text-align: center;
          font-size: 14pt;
          color: #666;
          margin-bottom: 30px;
        }

        .summary-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .stat-card {
          flex: 1;
          min-width: 150px;
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-label {
          font-size: 10pt;
          color: #666;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 16pt;
          font-weight: bold;
          color: #333;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          padding: 8px 4px;
          text-align: center;
          font-size: 9pt;
          border: 1px solid #333;
          background-color: #f5f5f5;
        }
        td {
          padding: 6px 4px;
          font-size: 8pt;
          border: 1px solid #ddd;
        }

        .status-paid { color: #065F46; font-weight: bold; }
        .status-pending { color: #92400E; font-weight: bold; }
        .status-processing { color: #3730A3; font-weight: bold; }
        .status-failed { color: #991B1B; font-weight: bold; }
        .status-on_hold { color: #9A3412; font-weight: bold; }

        .footer-summary {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
        }
        .footer-summary h3 {
          margin-bottom: 15px;
        }
        .footer-summary p {
          margin-bottom: 8px;
          font-size: 11pt;
        }
      </style>
    </head>
    <body>
      <div class="header-strip">
        <div class="header-content">
          <div class="logo-container">
            <div class="logo"><img src="${logoUrl}" alt="Company Logo" /></div>
          </div>
          <div class="company-name">SAS MIGRATION GROUP</div>
        </div>
      </div>

      <div class="content">
        <div class="summary-container">
          <h1 class="title">Payroll Summary Report</h1>
          <p class="subtitle">${monthName}</p>

          <div class="summary-stats">
            <div class="stat-card">
              <div class="stat-label">Total Employees</div>
              <div class="stat-value">${salaries.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Gross</div>
              <div class="stat-value">₹${totalGross.toLocaleString("en-IN")}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Deductions</div>
              <div class="stat-value">₹${totalDeductions.toLocaleString("en-IN")}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Net</div>
              <div class="stat-value">₹${totalNet.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 15%;">Name</th>
                <th style="width: 10%;">Emp ID</th>
                <th style="width: 10%;">Base</th>
                <th style="width: 10%;">Allow.</th>
                <th style="width: 10%;">Deduct.</th>
                <th style="width: 10%;">Bonus</th>
                <th style="width: 10%;">Net</th>
                <th style="width: 8%;">Hours</th>
                <th style="width: 12%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-summary">
            <h3>Payment Status Summary</h3>
            <p><strong>Paid:</strong> ${statusGroups.paid} employees</p>
            <p><strong>Pending:</strong> ${statusGroups.pending} employees</p>
            <p><strong>Processing:</strong> ${statusGroups.processing} employees</p>
            <p><strong>On Hold:</strong> ${statusGroups.on_hold} employees</p>
            <p><strong>Failed:</strong> ${statusGroups.failed} employees</p>
            <p style="margin-top: 15px; font-style: italic;">Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and download bulk salary slips PDF for a payroll period
 */
export async function generateBulkSalarySlips(
  periodId: string
): Promise<void> {
  try {
    // Fetch data
    const { period, salaries } = await fetchPayrollPeriodData(periodId);

    if (salaries.length === 0) {
      Alert.alert(
        "No Data",
        "No salary records found for this payroll period.",
        [{ text: "OK" }]
      );
      return;
    }

    // Generate HTML
    const html = generateBulkSalarySlipsHTML(period, salaries);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Create filename
    const fileName = `Salary_Slips_${formatPayrollPeriod(period.month, period.year).replace(" ", "_")}.pdf`;

    // Save/Share PDF
    if (Platform.OS === "android") {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(false);

        if (status === "granted") {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync("Download", asset, false);

          Alert.alert(
            "Success",
            `Bulk salary slips have been downloaded.\n\nFile: ${fileName}`,
            [{ text: "OK" }]
          );
          return;
        }
      } catch (error) {
        console.log("MediaLibrary not available, using share:", error);
      }

      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Salary Slips - ${formatPayrollPeriod(period.month, period.year)}`,
      });
    } else if (Platform.OS === "ios") {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Salary Slips - ${formatPayrollPeriod(period.month, period.year)}`,
      });
    }
  } catch (error) {
    console.error("Error generating bulk salary slips:", error);
    throw error;
  }
}

/**
 * Generate and download payroll summary PDF
 */
export async function generatePayrollSummaryPDF(
  periodId: string
): Promise<void> {
  try {
    // Fetch data
    const { period, salaries } = await fetchPayrollPeriodData(periodId);

    if (salaries.length === 0) {
      Alert.alert(
        "No Data",
        "No salary records found for this payroll period.",
        [{ text: "OK" }]
      );
      return;
    }

    // Generate HTML
    const html = generatePayrollSummaryHTML(period, salaries);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Create filename
    const fileName = `Payroll_Summary_${formatPayrollPeriod(period.month, period.year).replace(" ", "_")}.pdf`;

    // Save/Share PDF
    if (Platform.OS === "android") {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(false);

        if (status === "granted") {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync("Download", asset, false);

          Alert.alert(
            "Success",
            `Payroll summary has been downloaded.\n\nFile: ${fileName}`,
            [{ text: "OK" }]
          );
          return;
        }
      } catch (error) {
        console.log("MediaLibrary not available, using share:", error);
      }

      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Payroll Summary - ${formatPayrollPeriod(period.month, period.year)}`,
      });
    } else if (Platform.OS === "ios") {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Payroll Summary - ${formatPayrollPeriod(period.month, period.year)}`,
      });
    }
  } catch (error) {
    console.error("Error generating payroll summary:", error);
    throw error;
  }
}
