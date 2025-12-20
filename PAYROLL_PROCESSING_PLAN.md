# Payroll Processing System - Implementation Plan

## 🎯 Quick Summary

| Aspect | Details |
|--------|---------|
| **Feature Type** | HR & Admin Only |
| **Access Level** | 🔒 Restricted to `role IN ('hr', 'admin')` |
| **Employee Access** | ❌ None - Employees cannot see or use these features |
| **Location** | `app/(hr)/payroll/*` directory |
| **Employee Impact** | ✅ Zero - No changes to existing employee screens |
| **Database Impact** | ✅ Additive only - No data loss or removal |

---

## Overview
This document outlines the implementation plan for a comprehensive payroll processing system for the Salary Book app. The system will enable HR to manage monthly payroll cycles, review salary calculations, generate bulk salary slips, and track payment status.

### 🔒 **Important: HR-Only Feature**
**All payroll processing features are restricted to HR and Admin roles only.**

- ✅ **HR/Admin Access**: Full access to all payroll features
- ❌ **Employee Access**: Employees will NOT have access to any payroll processing features
- 👀 **Employee View**: Employees continue to view their own salary slips via existing screens (no changes)

**Access Points:**
- All payroll screens will be under `app/(hr)/payroll/*` directory
- All API calls will be protected by RLS policies checking for `role IN ('hr', 'admin')`
- UI components will check user role before rendering payroll features
- Employees continue to use `app/(employee)/salary.tsx` for viewing their own salary history

---

## 1. Database Schema Changes

### 1.1 New Table: `payroll_periods`
A new table to manage payroll periods/cycles for the organization.

```sql
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Period details
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Payroll status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'processing', 'completed', 'cancelled')),

  -- Processing details
  total_employees INTEGER DEFAULT 0,
  total_gross_salary NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_net_salary NUMERIC(15,2) DEFAULT 0,

  -- Payment tracking
  employees_paid INTEGER DEFAULT 0,
  total_amount_paid NUMERIC(15,2) DEFAULT 0,

  -- Processing metadata
  initiated_by UUID REFERENCES users(id),
  initiated_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Notes and metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one payroll period per month per organization
  UNIQUE(organization_id, month, year)
);

-- Indexes
CREATE INDEX idx_payroll_periods_org_status ON payroll_periods(organization_id, status);
CREATE INDEX idx_payroll_periods_org_date ON payroll_periods(organization_id, year DESC, month DESC);

-- Enable RLS
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR can view their organization's payroll periods"
  ON payroll_periods FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR can create payroll periods"
  ON payroll_periods FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR can update their organization's payroll periods"
  ON payroll_periods FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );
```

### 1.2 Update `salary_records` Table
Add new columns to track payroll period and payment status.

```sql
ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  payroll_period_id UUID REFERENCES payroll_periods(id);

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'on_hold'));

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  payment_reference TEXT; -- Transaction ID or payment reference

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  payment_mode TEXT
  CHECK (payment_mode IN ('bank_transfer', 'cash', 'cheque', 'upi', 'other'));

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  paid_by UUID REFERENCES users(id); -- HR who marked as paid

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  paid_at TIMESTAMP WITH TIME ZONE; -- When marked as paid

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS
  payment_notes TEXT;

-- Index for efficient payment status queries
CREATE INDEX IF NOT EXISTS idx_salary_records_payment_status
  ON salary_records(payment_status);

CREATE INDEX IF NOT EXISTS idx_salary_records_payroll_period
  ON salary_records(payroll_period_id);
```

### 1.3 New Table: `payment_transactions`
Track individual payment transactions for audit trail.

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_record_id UUID REFERENCES salary_records(id) ON DELETE CASCADE NOT NULL,
  payroll_period_id UUID REFERENCES payroll_periods(id) NOT NULL,

  -- Transaction details
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'upi', 'other')),
  reference_number TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'reversed')),

  -- Bank details (if applicable)
  bank_name TEXT,
  account_number TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE,

  -- Metadata
  processed_by UUID REFERENCES users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- For storing additional payment details

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_transactions_salary ON payment_transactions(salary_record_id);
CREATE INDEX idx_payment_transactions_payroll ON payment_transactions(payroll_period_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR can view their organization's payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM salary_records sr
      JOIN users u ON u.id = sr.user_id
      WHERE sr.id = payment_transactions.salary_record_id
      AND u.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr', 'admin')
      )
    )
  );

CREATE POLICY "HR can create payment transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salary_records sr
      JOIN users u ON u.id = sr.user_id
      WHERE sr.id = payment_transactions.salary_record_id
      AND u.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hr', 'admin')
      )
    )
  );
```

### 1.4 New Table: `bulk_payment_batches`
Track bulk payment operations for better auditing.

```sql
CREATE TABLE bulk_payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) NOT NULL,

  -- Batch details
  batch_name TEXT NOT NULL,
  total_employees INTEGER NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'partially_completed', 'failed')),

  -- Progress tracking
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Processing details
  initiated_by UUID REFERENCES users(id) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Notes and error logs
  notes TEXT,
  error_log JSONB DEFAULT '[]', -- Array of error messages

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bulk_payment_batches_payroll ON bulk_payment_batches(payroll_period_id);
CREATE INDEX idx_bulk_payment_batches_status ON bulk_payment_batches(status);

-- Enable RLS
ALTER TABLE bulk_payment_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR can view their organization's bulk payment batches"
  ON bulk_payment_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payroll_periods pp
      JOIN users u ON u.organization_id = pp.organization_id
      WHERE pp.id = bulk_payment_batches.payroll_period_id
      AND u.id = auth.uid()
      AND u.role IN ('hr', 'admin')
    )
  );
```

---

## 2. API Layer Implementation

### 2.1 Query Functions (`lib/api/queries/payroll.queries.ts`)

```typescript
// Get payroll periods with filters
getPayrollPeriods: async (filters?: {
  organizationId?: string;
  status?: string;
  year?: number;
}) => Promise<PayrollPeriod[]>

// Get specific payroll period
getPayrollPeriodById: async (periodId: string) => Promise<PayrollPeriod | null>

// Get payroll period for specific month/year
getPayrollPeriodByMonthYear: async (
  organizationId: string,
  month: number,
  year: number
) => Promise<PayrollPeriod | null>

// Get salary records for a payroll period
getSalaryRecordsByPeriod: async (
  payrollPeriodId: string
) => Promise<SalaryWithUser[]>

// Get payment statistics for a period
getPayrollPeriodStats: async (payrollPeriodId: string) => Promise<{
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  employeesPaid: number;
  employeesPending: number;
  totalPaid: number;
  totalPending: number;
}>

// Get payment transactions
getPaymentTransactions: async (filters?: {
  salaryRecordId?: string;
  payrollPeriodId?: string;
  status?: string;
}) => Promise<PaymentTransaction[]>

// Get bulk payment batches
getBulkPaymentBatches: async (payrollPeriodId: string) => Promise<BulkPaymentBatch[]>
```

### 2.2 Mutation Functions (`lib/api/mutations/payroll.mutations.ts`)

```typescript
// Create a new payroll period
createPayrollPeriod: async (params: {
  organizationId: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  initiatedBy: string;
  notes?: string;
}) => Promise<PayrollPeriod>

// Generate salary records for a payroll period
generatePayrollRecords: async (params: {
  payrollPeriodId: string;
  organizationId: string;
  month: number;
  year: number;
  createdBy: string;
}) => Promise<{ success: boolean; recordsCreated: number }>

// Update payroll period status
updatePayrollPeriodStatus: async (
  periodId: string,
  status: string,
  userId: string
) => Promise<PayrollPeriod>

// Mark salary as paid
markSalaryAsPaid: async (params: {
  salaryRecordId: string;
  paymentMethod: string;
  paymentReference?: string;
  paidBy: string;
  notes?: string;
}) => Promise<SalaryRecord>

// Bulk mark salaries as paid
bulkMarkSalariesPaid: async (params: {
  salaryRecordIds: string[];
  payrollPeriodId: string;
  paymentMethod: string;
  paidBy: string;
  notes?: string;
}) => Promise<{
  success: number;
  failed: number;
  batchId: string;
}>

// Update salary record details
updateSalaryRecord: async (
  recordId: string,
  updates: Partial<SalaryRecord>
) => Promise<SalaryRecord>

// Revert payment
revertPayment: async (params: {
  salaryRecordId: string;
  reason: string;
  revertedBy: string;
}) => Promise<SalaryRecord>

// Create payment transaction
createPaymentTransaction: async (params: {
  salaryRecordId: string;
  payrollPeriodId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  processedBy: string;
  notes?: string;
}) => Promise<PaymentTransaction>
```

---

## 3. React Query Hooks

### 3.1 Query Hooks (`hooks/queries/usePayroll.ts`)

```typescript
// Payroll period queries
usePayrollPeriods(filters?: PayrollFilters)
usePayrollPeriodById(periodId: string)
usePayrollPeriodByMonthYear(organizationId: string, month: number, year: number)
usePayrollPeriodStats(periodId: string)

// Salary records queries
useSalaryRecordsByPeriod(payrollPeriodId: string)
usePaymentTransactions(filters?: PaymentFilters)
useBulkPaymentBatches(payrollPeriodId: string)
```

### 3.2 Mutation Hooks (`hooks/mutations/usePayrollMutations.ts`)

```typescript
// Payroll period mutations
useCreatePayrollPeriod()
useGeneratePayrollRecords()
useUpdatePayrollPeriodStatus()

// Payment mutations
useMarkSalaryAsPaid()
useBulkMarkSalariesPaid()
useUpdateSalaryRecord()
useRevertPayment()
useCreatePaymentTransaction()
```

---

## 4. UI Components

### 🔒 **Access Control: All UI components are HR/Admin Only**

**Employee vs HR Separation:**
- 📂 **HR Screens**: `app/(hr)/payroll/*` - Complete payroll management (NEW)
- 📂 **Employee Screens**: `app/(employee)/salary.tsx` - View own salary history (EXISTING - No Changes)
- 🛡️ **Protection**: All payroll components check user role before rendering
- 🚫 **No Employee Access**: Employees cannot access payroll processing features

### 4.1 New Screens (HR Only)

#### `app/(hr)/payroll/index.tsx` - Payroll Dashboard (HR Only)
- List of payroll periods with status badges
- Quick stats: total payroll, paid vs pending
- Filter by status, month, year
- Create new payroll period button
- View/Edit payroll period navigation

#### `app/(hr)/payroll/[id].tsx` - Payroll Period Detail
- Period information (month, year, dates, status)
- Employee salary records table with:
  - Employee name, department
  - Base salary, deductions, allowances, net salary
  - Payment status with color-coded badges
  - Individual payment action buttons
- Bulk actions:
  - Select all/multiple employees
  - Bulk mark as paid
  - Export salary slips (PDF)
  - Export Excel sheet
- Status workflow actions:
  - Draft → In Review → Approved → Processing → Completed
- Payment tracking summary
- Transaction history

#### `app/(hr)/payroll/create.tsx` - Create Payroll Period
- Month/Year selector
- Auto-calculate start/end dates
- Preview employee list
- Generate salary records

### 4.2 Modals & Components

#### `components/payroll/PayrollPeriodCard.tsx`
- Display payroll period summary
- Status badge
- Quick stats (employees, total amount, paid percentage)
- Action buttons

#### `components/payroll/SalaryRecordRow.tsx`
- Employee salary record display
- Expandable for details
- Payment status indicator
- Action buttons (mark paid, view slip, edit)

#### `components/payroll/PaymentStatusBadge.tsx`
- Color-coded status badges
- Icons for different statuses

#### `components/payroll/BulkPaymentModal.tsx`
- Select payment method
- Enter payment reference
- Add notes
- Confirm bulk payment

#### `components/payroll/SalaryAdjustmentModal.tsx`
- Edit salary components (base, allowances, deductions, bonus)
- Recalculate total
- Reason for adjustment

#### `components/payroll/PayrollStatsCard.tsx`
- Display key metrics
- Progress bars for payment completion
- Visual indicators

---

## 5. Utility Functions

### 5.1 Payroll Utils (`lib/utils/payroll.utils.ts`)

```typescript
// Calculate date range for payroll period
calculatePayrollDates(month: number, year: number): {
  startDate: string;
  endDate: string;
}

// Calculate salary components
calculateSalaryComponents(params: {
  baseSalary: number;
  hoursWorked: number;
  expectedHours: number;
  hourlyRate: number;
  allowances?: number;
  deductions?: number;
  bonus?: number;
}): SalaryCalculation

// Validate payroll period
validatePayrollPeriod(
  organizationId: string,
  month: number,
  year: number
): Promise<{ valid: boolean; message?: string }>

// Calculate payment completion percentage
calculatePaymentProgress(
  totalEmployees: number,
  paidEmployees: number
): number

// Format payment status
formatPaymentStatus(status: string): {
  label: string;
  color: string;
  icon: string;
}

// Calculate payroll summary
calculatePayrollSummary(salaryRecords: SalaryRecord[]): {
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  averageSalary: number;
}
```

### 5.2 Bulk Salary Slip Generation (`lib/utils/bulkSalarySlip.utils.ts`)

```typescript
// Generate multiple salary slips
generateBulkSalarySlips(
  payrollPeriodId: string,
  employeeIds?: string[]
): Promise<{ uri: string; fileName: string }>

// Generate Excel sheet with all salaries
generatePayrollExcelSheet(
  payrollPeriodId: string
): Promise<{ uri: string; fileName: string }>

// Generate payment summary report
generatePaymentSummaryReport(
  payrollPeriodId: string
): Promise<{ uri: string; fileName: string }>
```

---

## 6. Workflows

### 6.1 Payroll Processing Workflow

```
1. DRAFT → Create payroll period
   - Select month/year
   - System generates salary records based on attendance
   - HR can review and adjust

2. IN_REVIEW → Submit for review
   - Lock salary calculations
   - Generate preview reports
   - HR can still make adjustments

3. APPROVED → Approve payroll
   - Final approval from authorized HR/Admin
   - Lock all records
   - Ready for payment processing

4. PROCESSING → Process payments
   - Mark salaries as paid (individual or bulk)
   - Track payment status
   - Handle failed payments

5. COMPLETED → Complete payroll
   - All salaries marked as paid
   - Generate final reports
   - Archive period
```

### 6.2 Payment Workflow

```
1. Select employees to pay
2. Choose payment method
3. Enter payment reference (optional)
4. Add notes (optional)
5. Confirm payment
6. System updates:
   - salary_records.payment_status → 'paid'
   - salary_records.paid_at → current timestamp
   - salary_records.paid_by → HR user ID
   - Creates payment_transaction record
7. Update payroll_period stats
```

---

## 7. Features Summary

### 7.1 Core Features
- ✅ **Payroll Period Management**: Create, view, and manage monthly payroll cycles
- ✅ **Automated Salary Calculation**: Generate salary records based on attendance data
- ✅ **Salary Review & Adjustment**: Review and modify salary components before payment
- ✅ **Payment Status Tracking**: Track payment status (pending, paid, failed)
- ✅ **Bulk Payment Processing**: Mark multiple salaries as paid in one action
- ✅ **Individual Payment Processing**: Process payments one by one
- ✅ **Payment Reversion**: Ability to revert incorrect payments
- ✅ **Audit Trail**: Complete transaction history for compliance

### 7.2 Reporting Features
- ✅ **Bulk PDF Generation**: Generate salary slips for all employees
- ✅ **Excel Export**: Export payroll data to Excel
- ✅ **Payment Summary Reports**: Generate payment summary reports
- ✅ **Transaction History**: View all payment transactions

### 7.3 Status Management
- Draft, In Review, Approved, Processing, Completed
- Pending, Processing, Paid, Failed, On Hold (individual payments)

### 7.4 What Employees Will NOT See 🚫

**Employees have ZERO access to:**
- ❌ Payroll period management screens
- ❌ Payment status of other employees
- ❌ Bulk payment processing features
- ❌ Salary adjustment capabilities
- ❌ Payment transaction history
- ❌ Bulk salary slip generation
- ❌ Excel export functionality
- ❌ Payroll statistics and dashboards
- ❌ Any HR payroll management tools

**Employees can ONLY:**
- ✅ View their own salary history (`app/(employee)/salary.tsx`)
- ✅ Download their individual salary slips (existing feature)
- ✅ See their own attendance records
- ✅ View their own earnings summary

**No changes to employee experience!** All existing employee salary features remain exactly the same.

---

## 8. Implementation Phases

### Phase 1: Database & API Layer (Week 1)
- [ ] Create new database tables
- [ ] Add columns to existing tables
- [ ] Implement RLS policies
- [ ] Write query functions
- [ ] Write mutation functions
- [ ] Write tests for API layer

### Phase 2: React Query Integration (Week 1-2)
- [ ] Create query hooks
- [ ] Create mutation hooks
- [ ] Implement cache invalidation strategies
- [ ] Handle optimistic updates

### Phase 3: UI Components (Week 2-3)
- [ ] Build Payroll Dashboard
- [ ] Build Payroll Period Detail screen
- [ ] Build Create Payroll screen
- [ ] Create reusable components (cards, badges, modals)
- [ ] Implement bulk payment modal
- [ ] Implement salary adjustment modal

### Phase 4: Utilities & Reports (Week 3-4)
- [ ] Payroll calculation utilities
- [ ] Bulk PDF generation
- [ ] Excel export functionality
- [ ] Payment summary reports
- [ ] Date and status formatting utilities

### Phase 5: Testing & Refinement (Week 4)
- [ ] Integration testing
- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] UI/UX refinements
- [ ] Error handling improvements

### Phase 6: Documentation & Deployment (Week 4)
- [ ] User documentation
- [ ] API documentation
- [ ] Database migration scripts
- [ ] Deployment and rollout

---

## 9. Security Considerations

1. **Role-Based Access Control**: Only HR and Admin can access payroll features
2. **RLS Policies**: All tables have proper row-level security
3. **Audit Trail**: All payment actions are logged
4. **Data Validation**: Server-side validation for all mutations
5. **Payment Verification**: Confirmation required for bulk operations
6. **Sensitive Data Protection**: Bank details and payment info encrypted

---

## 10. Performance Considerations

1. **Pagination**: Implement pagination for large employee lists
2. **Lazy Loading**: Load payment transactions on demand
3. **Optimistic Updates**: Quick UI feedback for actions
4. **Background Processing**: Generate bulk PDFs in background
5. **Caching**: Aggressive caching for payroll period data
6. **Indexes**: Proper database indexes for fast queries

---

## 11. Future Enhancements (Post-MVP)

1. **Automated Payment Integration**: Integrate with payment gateways
2. **Recurring Deductions**: Support for loans, advances, etc.
3. **Tax Calculations**: Automatic TDS/tax calculations
4. **Payroll Analytics**: Advanced analytics and insights
5. **Email Notifications**: Auto-send salary slips via email
6. **Mobile App Support**: Optimize for mobile devices
7. **Multi-Currency Support**: For international organizations
8. **Approval Workflows**: Multi-level approval system
9. **Payroll Templates**: Save and reuse payroll configurations
10. **Integration with Accounting Software**: Export to Tally, QuickBooks, etc.

---

## 12. Migration Strategy

### 12.1 Data Migration
- Existing `salary_records` remain intact
- Add `payroll_period_id` as nullable initially
- Create payroll periods for historical data
- Link historical salary records to periods

### 12.2 Backward Compatibility
- Old salary slip generation continues to work
- New system works alongside existing system
- Gradual migration of HR workflows

---

## 13. Success Metrics

1. **Time Saved**: Reduce payroll processing time by 60%
2. **Accuracy**: Zero manual calculation errors
3. **Transparency**: Complete visibility into payment status
4. **Compliance**: Full audit trail for all transactions
5. **User Satisfaction**: Positive feedback from HR team

---

## Notes

- This plan maintains all existing functionality
- No data loss or removal
- Database changes are additive (new tables, new columns)
- All existing queries remain functional
- RLS policies ensure security
- Clean separation of concerns following CLAUDE.md guidelines
- Uses TanStack Query pattern throughout

---

**Document Version**: 1.0
**Created**: 2025-11-21
**Status**: Planning Phase
**Next Steps**: Database schema implementation and approval
