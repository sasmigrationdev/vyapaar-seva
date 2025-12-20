# Cash Book Implementation Plan (HR Side)

## Overview
Simplified Cash Book feature for HR to track business income and expenses with running balance calculations and monthly summaries.

**🎤 Voice Input Enhancement:** See [VOICEPLAN.md](./VOICEPLAN.md) for AI-powered voice transaction entry using Groq's latest STT and LLM models.

---

## Core Features (MVP)

1. ✅ **Category Management** - Create and manage income/expense categories
2. ✅ **Add Income Entries** - Record money received
3. ✅ **Add Expense Entries** - Record money spent
4. ✅ **Transaction Categorization** - Assign categories to each transaction
5. ✅ **Running Balance Calculation** - Automatic balance tracking after each transaction
6. ✅ **Monthly Financial Summary** - Income vs Expense reports

---

## Database Schema

### 1. `financial_categories` Table
```sql
CREATE TABLE financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'folder',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, name, type)
);

-- Default categories to seed
INSERT INTO financial_categories (organization_id, name, type, color, icon) VALUES
-- Income categories
('org_id', 'Client Payments', 'income', '#10B981', 'cash'),
('org_id', 'Consulting Revenue', 'income', '#059669', 'briefcase'),
('org_id', 'Other Income', 'income', '#34D399', 'plus-circle'),

-- Expense categories
('org_id', 'Salary Payments', 'expense', '#EF4444', 'users'),
('org_id', 'Office Rent', 'expense', '#DC2626', 'home'),
('org_id', 'Utilities', 'expense', '#F97316', 'zap'),
('org_id', 'Office Supplies', 'expense', '#F59E0B', 'shopping-cart'),
('org_id', 'Travel', 'expense', '#3B82F6', 'navigation'),
('org_id', 'Other Expenses', 'expense', '#6B7280', 'minus-circle');
```

### 2. `financial_transactions` Table
```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,

  -- Date and description
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,

  -- Balance tracking
  balance_after DECIMAL(15, 2),

  -- Payment details
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'upi', 'card', 'cheque')),
  reference_number TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Indexes for performance
  INDEX idx_org_date (organization_id, transaction_date DESC),
  INDEX idx_org_type (organization_id, type),
  INDEX idx_org_category (organization_id, category_id)
);

-- Trigger to calculate balance after each transaction
CREATE OR REPLACE FUNCTION calculate_balance_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the last balance before this transaction
  WITH last_balance AS (
    SELECT balance_after
    FROM financial_transactions
    WHERE organization_id = NEW.organization_id
      AND transaction_date <= NEW.transaction_date
      AND id != NEW.id
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT balance_after FROM last_balance),
    0
  ) + (
    CASE
      WHEN NEW.type = 'income' THEN NEW.amount
      WHEN NEW.type = 'expense' THEN -NEW.amount
    END
  ) INTO NEW.balance_after;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_balance
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_balance_after_transaction();
```

### 3. Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- HR can view/manage all financial data for their organization
CREATE POLICY "HR can manage financial categories"
  ON financial_categories
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'hr'
    )
  );

CREATE POLICY "HR can manage financial transactions"
  ON financial_transactions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'hr'
    )
  );
```

---

## File Structure

Following the TanStack Query pattern from CLAUDE.md:

```
/lib
  /api
    /queries
      /financial.queries.ts          # All query functions
    /mutations
      /financial.mutations.ts        # All mutation functions
  /utils
    /financial.utils.ts              # Helper functions (balance calc, etc.)
  /types
    /financial.types.ts              # TypeScript types

/hooks
  /queries
    /useFinancial.ts                 # Query hooks
  /mutations
    /useFinancialMutations.ts        # Mutation hooks

/components
  /financial
    /CategoryCard.tsx                # Display category
    /CategoryList.tsx                # List all categories
    /TransactionCard.tsx             # Display transaction
    /TransactionList.tsx             # List transactions
    /AddTransactionModal.tsx         # Add income/expense
    /EditTransactionModal.tsx        # Edit transaction
    /CategoryModal.tsx               # Add/Edit category
    /FinancialSummary.tsx            # Monthly summary card
    /BalanceCard.tsx                 # Current balance display

/app
  /hr
    /financial
      /index.tsx                     # Financial dashboard
      /categories.tsx                # Manage categories
      /transactions.tsx              # All transactions
      /reports.tsx                   # Monthly reports
```

---

## Implementation Details

### 1. Query Functions (`lib/api/queries/financial.queries.ts`)

```typescript
import { supabase } from '@/lib/supabase/client';
import { FinancialCategory, FinancialTransaction } from '@/lib/types/financial.types';

export const financialQueries = {
  /**
   * Get all categories for an organization
   */
  getCategories: async (
    organizationId: string,
    type?: 'income' | 'expense'
  ): Promise<FinancialCategory[]> => {
    let query = supabase
      .from('financial_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get all transactions for an organization
   */
  getTransactions: async (
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: 'income' | 'expense';
      categoryId?: string;
    }
  ): Promise<FinancialTransaction[]> => {
    let query = supabase
      .from('financial_transactions')
      .select(`
        *,
        category:financial_categories(id, name, type, color, icon),
        created_by_user:users(full_name)
      `)
      .eq('organization_id', organizationId);

    if (filters?.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Get current balance
   */
  getCurrentBalance: async (organizationId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('balance_after')
      .eq('organization_id', organizationId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.balance_after || 0;
  },

  /**
   * Get monthly summary
   */
  getMonthlySummary: async (
    organizationId: string,
    month: number,
    year: number
  ) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('financial_transactions')
      .select('type, amount, category:financial_categories(name, color)')
      .eq('organization_id', organizationId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    const transactions = data || [];
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    // Group by category
    const categoryBreakdown = transactions.reduce((acc, t) => {
      const categoryName = t.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          color: t.category?.color || '#6B7280',
          amount: 0,
          type: t.type,
        };
      }
      acc[categoryName].amount += Number(t.amount);
      return acc;
    }, {} as Record<string, any>);

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance,
      transactionCount: transactions.length,
      categoryBreakdown: Object.values(categoryBreakdown),
    };
  },

  /**
   * Get transaction by ID
   */
  getTransactionById: async (id: string): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        category:financial_categories(id, name, type, color, icon)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },
};
```

### 2. Mutation Functions (`lib/api/mutations/financial.mutations.ts`)

```typescript
import { supabase } from '@/lib/supabase/client';

export const financialMutations = {
  /**
   * Create a new category
   */
  createCategory: async (params: {
    organizationId: string;
    name: string;
    type: 'income' | 'expense';
    color?: string;
    icon?: string;
    createdBy: string;
  }) => {
    const { data, error } = await supabase
      .from('financial_categories')
      .insert({
        organization_id: params.organizationId,
        name: params.name,
        type: params.type,
        color: params.color || '#6B7280',
        icon: params.icon || 'folder',
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a category
   */
  updateCategory: async (
    categoryId: string,
    updates: {
      name?: string;
      color?: string;
      icon?: string;
    }
  ) => {
    const { data, error } = await supabase
      .from('financial_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a category (soft delete)
   */
  deleteCategory: async (categoryId: string) => {
    const { data, error } = await supabase
      .from('financial_categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Add a transaction (income or expense)
   */
  addTransaction: async (params: {
    organizationId: string;
    type: 'income' | 'expense';
    amount: number;
    categoryId: string;
    transactionDate: string;
    description?: string;
    notes?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    createdBy: string;
  }) => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        organization_id: params.organizationId,
        type: params.type,
        amount: params.amount,
        category_id: params.categoryId,
        transaction_date: params.transactionDate,
        description: params.description,
        notes: params.notes,
        payment_method: params.paymentMethod || 'cash',
        reference_number: params.referenceNumber,
        created_by: params.createdBy,
      })
      .select(`
        *,
        category:financial_categories(id, name, type, color, icon)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a transaction
   */
  updateTransaction: async (
    transactionId: string,
    updates: {
      amount?: number;
      categoryId?: string;
      transactionDate?: string;
      description?: string;
      notes?: string;
      paymentMethod?: string;
      referenceNumber?: string;
    }
  ) => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.categoryId) updateData.category_id = updates.categoryId;
    if (updates.transactionDate) updateData.transaction_date = updates.transactionDate;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;
    if (updates.referenceNumber !== undefined) updateData.reference_number = updates.referenceNumber;

    const { data, error } = await supabase
      .from('financial_transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select(`
        *,
        category:financial_categories(id, name, type, color, icon)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a transaction
   */
  deleteTransaction: async (transactionId: string) => {
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', transactionId);

    if (error) throw error;
    return true;
  },
};
```

### 3. TypeScript Types (`lib/types/financial.types.ts`)

```typescript
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
```

### 4. Query Hooks (`hooks/queries/useFinancial.ts`)

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { financialQueries } from '@/lib/api/queries/financial.queries';
import { FinancialCategory, FinancialTransaction, MonthlySummary } from '@/lib/types/financial.types';

/**
 * Query keys
 */
export const financialKeys = {
  all: ['financial'] as const,
  categories: (orgId: string, type?: 'income' | 'expense') =>
    [...financialKeys.all, 'categories', orgId, type] as const,
  transactions: (orgId: string, filters?: object) =>
    [...financialKeys.all, 'transactions', orgId, filters] as const,
  balance: (orgId: string) =>
    [...financialKeys.all, 'balance', orgId] as const,
  summary: (orgId: string, month: number, year: number) =>
    [...financialKeys.all, 'summary', orgId, month, year] as const,
  transaction: (id: string) =>
    [...financialKeys.all, 'transaction', id] as const,
};

/**
 * Get categories
 */
export const useCategories = (
  organizationId: string,
  type?: 'income' | 'expense',
  options?: UseQueryOptions<FinancialCategory[]>
) => {
  return useQuery({
    queryKey: financialKeys.categories(organizationId, type),
    queryFn: () => financialQueries.getCategories(organizationId, type),
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Get transactions
 */
export const useTransactions = (
  organizationId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'income' | 'expense';
    categoryId?: string;
  },
  options?: UseQueryOptions<FinancialTransaction[]>
) => {
  return useQuery({
    queryKey: financialKeys.transactions(organizationId, filters),
    queryFn: () => financialQueries.getTransactions(organizationId, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Get current balance
 */
export const useCurrentBalance = (
  organizationId: string,
  options?: UseQueryOptions<number>
) => {
  return useQuery({
    queryKey: financialKeys.balance(organizationId),
    queryFn: () => financialQueries.getCurrentBalance(organizationId),
    staleTime: 1000 * 60 * 1, // 1 minute
    ...options,
  });
};

/**
 * Get monthly summary
 */
export const useMonthlySummary = (
  organizationId: string,
  month: number,
  year: number,
  options?: UseQueryOptions<MonthlySummary>
) => {
  return useQuery({
    queryKey: financialKeys.summary(organizationId, month, year),
    queryFn: () => financialQueries.getMonthlySummary(organizationId, month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
};

/**
 * Get transaction by ID
 */
export const useTransaction = (
  id: string,
  options?: UseQueryOptions<FinancialTransaction>
) => {
  return useQuery({
    queryKey: financialKeys.transaction(id),
    queryFn: () => financialQueries.getTransactionById(id),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};
```

### 5. Mutation Hooks (`hooks/mutations/useFinancialMutations.ts`)

```typescript
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { financialMutations } from '@/lib/api/mutations/financial.mutations';
import { financialKeys } from '@/hooks/queries/useFinancial';
import { FinancialCategory, FinancialTransaction } from '@/lib/types/financial.types';

/**
 * Create category
 */
export const useCreateCategory = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialCategory,
    Error,
    {
      name: string;
      type: 'income' | 'expense';
      color?: string;
      icon?: string;
      createdBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      financialMutations.createCategory({ ...params, organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.categories(organizationId) });
    },
    ...options,
  });
};

/**
 * Update category
 */
export const useUpdateCategory = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialCategory,
    Error,
    {
      categoryId: string;
      updates: {
        name?: string;
        color?: string;
        icon?: string;
      };
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, updates }) =>
      financialMutations.updateCategory(categoryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.categories(organizationId) });
    },
    ...options,
  });
};

/**
 * Delete category
 */
export const useDeleteCategory = (
  organizationId: string,
  options?: UseMutationOptions<FinancialCategory, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      financialMutations.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.categories(organizationId) });
    },
    ...options,
  });
};

/**
 * Add transaction
 */
export const useAddTransaction = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialTransaction,
    Error,
    {
      type: 'income' | 'expense';
      amount: number;
      categoryId: string;
      transactionDate: string;
      description?: string;
      notes?: string;
      paymentMethod?: string;
      referenceNumber?: string;
      createdBy: string;
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) =>
      financialMutations.addTransaction({ ...params, organizationId }),
    onSuccess: (data) => {
      // Invalidate transactions list
      queryClient.invalidateQueries({ queryKey: financialKeys.transactions(organizationId) });

      // Invalidate balance
      queryClient.invalidateQueries({ queryKey: financialKeys.balance(organizationId) });

      // Invalidate monthly summary
      const date = new Date(data.transaction_date);
      queryClient.invalidateQueries({
        queryKey: financialKeys.summary(organizationId, date.getMonth(), date.getFullYear())
      });
    },
    ...options,
  });
};

/**
 * Update transaction
 */
export const useUpdateTransaction = (
  organizationId: string,
  options?: UseMutationOptions<
    FinancialTransaction,
    Error,
    {
      transactionId: string;
      updates: {
        amount?: number;
        categoryId?: string;
        transactionDate?: string;
        description?: string;
        notes?: string;
        paymentMethod?: string;
        referenceNumber?: string;
      };
    }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, updates }) =>
      financialMutations.updateTransaction(transactionId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financialKeys.transactions(organizationId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.balance(organizationId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.transaction(data.id) });

      const date = new Date(data.transaction_date);
      queryClient.invalidateQueries({
        queryKey: financialKeys.summary(organizationId, date.getMonth(), date.getFullYear())
      });
    },
    ...options,
  });
};

/**
 * Delete transaction
 */
export const useDeleteTransaction = (
  organizationId: string,
  options?: UseMutationOptions<boolean, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      financialMutations.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.transactions(organizationId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.balance(organizationId) });
      queryClient.invalidateQueries({ queryKey: financialKeys.all });
    },
    ...options,
  });
};
```

---

## UI Screens

### 1. Financial Dashboard (`app/hr/financial/index.tsx`)

**Features:**
- Current balance card (large, prominent)
- Quick add income/expense buttons
- **🎤 Voice input button** (see [VOICEPLAN.md](./VOICEPLAN.md) for voice capture implementation)
- Recent transactions (last 5)
- Monthly summary chart
- Quick filters (This Month, Last Month, Custom Range)

### 2. Categories Management (`app/hr/financial/categories.tsx`)

**Features:**
- List of income categories
- List of expense categories
- Add new category button
- Edit/Delete category actions
- Color picker for categories

### 3. All Transactions (`app/hr/financial/transactions.tsx`)

**Features:**
- List all transactions (paginated)
- Filter by date range, type, category
- Search by description
- Add transaction floating button (with voice input option)
- **🎤 Voice capture integration** for quick transaction entry
- Edit/Delete transaction actions

### 4. Monthly Reports (`app/hr/financial/reports.tsx`)

**Features:**
- Month/Year selector
- Income vs Expense comparison
- Category-wise breakdown (pie chart)
- Transaction count
- Net profit/loss

---

## Implementation Phases

### **Phase 1: Database Setup** (Day 1)
- [ ] Create migration for `financial_categories` table
- [ ] Create migration for `financial_transactions` table
- [ ] Add RLS policies
- [ ] Seed default categories
- [ ] Test database triggers for balance calculation

### **Phase 2: API Layer** (Day 2)
- [ ] Create `financial.queries.ts` with all query functions
- [ ] Create `financial.mutations.ts` with all mutation functions
- [ ] Create `financial.types.ts` with TypeScript types
- [ ] Create `financial.utils.ts` with helper functions
- [ ] Test all API functions

### **Phase 3: React Query Hooks** (Day 3)
- [ ] Create `useFinancial.ts` with query hooks
- [ ] Create `useFinancialMutations.ts` with mutation hooks
- [ ] Test hooks with sample data
- [ ] Verify cache invalidation

### **Phase 4: UI Components** (Day 4-5)
- [ ] Create `BalanceCard.tsx`
- [ ] Create `CategoryCard.tsx` and `CategoryList.tsx`
- [ ] Create `TransactionCard.tsx` and `TransactionList.tsx`
- [ ] Create `AddTransactionModal.tsx` (with voice input integration)
- [ ] Create `FinancialSummary.tsx`
- [ ] Create `CategoryModal.tsx`
- [ ] **Optional:** Create voice components (see [VOICEPLAN.md](./VOICEPLAN.md))

### **Phase 5: Screens** (Day 6-7)
- [ ] Financial Dashboard screen
- [ ] Categories management screen
- [ ] All transactions screen
- [ ] Monthly reports screen
- [ ] Add navigation to HR tabs

### **Phase 6: Testing & Polish** (Day 8)
- [ ] Test all CRUD operations
- [ ] Test balance calculations
- [ ] Test monthly summaries
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with real data

---

## Key Calculations

### Running Balance
```typescript
// Calculated automatically by database trigger
// Formula: previous_balance + (income) - (expense)

export const calculateBalance = (
  previousBalance: number,
  amount: number,
  type: 'income' | 'expense'
): number => {
  return type === 'income'
    ? previousBalance + amount
    : previousBalance - amount;
};
```

### Monthly Summary
```typescript
export const calculateMonthlySummary = (transactions: FinancialTransaction[]) => {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    profitMargin: income > 0 ? ((income - expense) / income) * 100 : 0,
  };
};
```

---

## Security Considerations

1. **HR Only Access**: RLS policies ensure only HR users can access financial data
2. **Organization Isolation**: All queries filtered by organization_id
3. **Audit Trail**: Track who created/updated each transaction
4. **Input Validation**: Validate amounts, dates, and required fields
5. **Soft Deletes**: Consider soft deletes for categories to maintain data integrity

---

## Future Enhancements (Post-MVP)

- [ ] **🎤 Voice Input for Transactions** - See [VOICEPLAN.md](./VOICEPLAN.md) for complete implementation
- [ ] Receipt/Bill attachments
- [ ] Recurring transactions
- [ ] Budget setting and alerts
- [ ] Export to PDF/Excel
- [ ] Advanced analytics and charts
- [ ] Multi-currency support
- [ ] Petty cash management
- [ ] Vendor management
- [ ] Payment reminders
- [ ] Bank reconciliation

---

## Notes

- All transactions automatically calculate running balance via database trigger
- Monthly summaries are calculated on-demand (not stored)
- Categories can be customized per organization
- Default categories are seeded during migration
- Balance is always stored with transactions for historical accuracy
- Follows existing app patterns for consistency
