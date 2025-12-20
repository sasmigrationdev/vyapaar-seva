export interface FinancialCategory {
  id: string;
  organization_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface FinancialTransaction {
  id: string;
  organization_id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  transaction_date: string;
  description?: string;
  notes?: string;
  balance_after: number;
  payment_method: 'cash' | 'bank' | 'upi' | 'card' | 'cheque';
  reference_number?: string;
  created_at: string;
  updated_at: string;
  created_by: string;

  // Relations
  category?: FinancialCategory;
  created_by_user?: {
    full_name: string;
  };
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  categoryBreakdown: {
    name: string;
    color: string;
    amount: number;
    type: 'income' | 'expense';
  }[];
}
