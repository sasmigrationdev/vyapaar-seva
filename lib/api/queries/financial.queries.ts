import { supabase } from "@/lib/supabase/client";
import {
  FinancialCategory,
  FinancialTransaction,
} from "@/lib/types/financial.types";

export const financialQueries = {
  /**
   * Get all categories for an organization
   */
  getCategories: async (
    organizationId: string,
    type?: "income" | "expense"
  ): Promise<FinancialCategory[]> => {
    let query = supabase
      .from("financial_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name");

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as FinancialCategory[]) || [];
  },

  /**
   * Get all transactions for an organization
   */
  getTransactions: async (
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: "income" | "expense";
      categoryId?: string;
    }
  ): Promise<FinancialTransaction[]> => {
    let query = supabase
      .from("financial_transactions")
      .select(
        `
        *,
        category:financial_categories(id, name, type, color, icon),
        created_by_user:users(full_name)
      `
      )
      .eq("organization_id", organizationId);

    if (filters?.startDate) {
      query = query.gte("transaction_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("transaction_date", filters.endDate);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    const { data, error } = await query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as FinancialTransaction[]) || [];
  },

  /**
   * Get current balance
   */
  getCurrentBalance: async (organizationId: string): Promise<number> => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("balance_after")
      .eq("organization_id", organizationId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
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
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("financial_transactions")
      .select("type, amount, category:financial_categories(name, color)")
      .eq("organization_id", organizationId)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (error) throw error;

    const transactions = data || [];
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    // Group by category
    const categoryBreakdown = transactions.reduce((acc, t) => {
      const categoryName = t.category?.name || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          color: t.category?.color || "#6B7280",
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
      .from("financial_transactions")
      .select(
        `
        *,
        category:financial_categories(id, name, type, color, icon)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as FinancialTransaction;
  },
};
