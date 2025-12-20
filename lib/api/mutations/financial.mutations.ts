import { supabase } from "@/lib/supabase/client";
import {
  FinancialCategory,
  FinancialTransaction,
} from "@/lib/types/financial.types";

export const financialMutations = {
  /**
   * Create a new category
   */
  createCategory: async (params: {
    organizationId: string;
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
    createdBy: string;
  }): Promise<FinancialCategory> => {
    const { data, error } = await supabase
      .from("financial_categories")
      .insert({
        organization_id: params.organizationId,
        name: params.name,
        type: params.type,
        color: params.color || "#6B7280",
        icon: params.icon || "folder",
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data as FinancialCategory;
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
  ): Promise<FinancialCategory> => {
    const { data, error } = await supabase
      .from("financial_categories")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) throw error;
    return data as FinancialCategory;
  },

  /**
   * Delete a category (soft delete)
   */
  deleteCategory: async (categoryId: string): Promise<FinancialCategory> => {
    const { data, error } = await supabase
      .from("financial_categories")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) throw error;
    return data as FinancialCategory;
  },

  /**
   * Add a transaction (income or expense)
   */
  addTransaction: async (params: {
    organizationId: string;
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    transactionDate: string;
    description?: string;
    notes?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    createdBy: string;
  }): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        organization_id: params.organizationId,
        type: params.type,
        amount: params.amount,
        category_id: params.categoryId,
        transaction_date: params.transactionDate,
        description: params.description,
        notes: params.notes,
        payment_method: params.paymentMethod || "cash",
        reference_number: params.referenceNumber,
        created_by: params.createdBy,
      })
      .select(
        `
        *,
        category:financial_categories(id, name, type, color, icon)
      `
      )
      .single();

    if (error) throw error;

    // Recalculate all balance_after values for this organization
    await financialMutations.recalculateBalances(params.organizationId);

    // Fetch the updated transaction with correct balance_after
    const { data: updatedData, error: fetchError } = await supabase
      .from("financial_transactions")
      .select(
        `
        *,
        category:financial_categories(id, name, type, color, icon)
      `
      )
      .eq("id", data.id)
      .single();

    if (fetchError) throw fetchError;
    return updatedData as FinancialTransaction;
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
  ): Promise<FinancialTransaction> => {
    // First get the organization_id from the transaction
    const { data: transaction, error: fetchError } = await supabase
      .from("financial_transactions")
      .select("organization_id")
      .eq("id", transactionId)
      .single();

    if (fetchError) throw fetchError;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.categoryId) updateData.category_id = updates.categoryId;
    if (updates.transactionDate)
      updateData.transaction_date = updates.transactionDate;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.paymentMethod)
      updateData.payment_method = updates.paymentMethod;
    if (updates.referenceNumber !== undefined)
      updateData.reference_number = updates.referenceNumber;

    const { data, error } = await supabase
      .from("financial_transactions")
      .update(updateData)
      .eq("id", transactionId)
      .select(
        `
        *,
        category:financial_categories(id, name, type, color, icon)
      `
      )
      .single();

    if (error) throw error;

    // Recalculate all balance_after values if amount or date changed
    if (updates.amount !== undefined || updates.transactionDate !== undefined) {
      await financialMutations.recalculateBalances(transaction.organization_id);

      // Fetch the updated transaction with correct balance_after
      const { data: updatedData, error: refetchError } = await supabase
        .from("financial_transactions")
        .select(
          `
          *,
          category:financial_categories(id, name, type, color, icon)
        `
        )
        .eq("id", transactionId)
        .single();

      if (refetchError) throw refetchError;
      return updatedData as FinancialTransaction;
    }

    return data as FinancialTransaction;
  },

  /**
   * Delete a transaction
   */
  deleteTransaction: async (transactionId: string, organizationId: string) => {
    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", transactionId);

    if (error) throw error;

    // Recalculate all balance_after values for this organization
    await financialMutations.recalculateBalances(organizationId);

    return true;
  },

  /**
   * Recalculate balance_after for all transactions in an organization
   */
  recalculateBalances: async (organizationId: string) => {
    // Fetch all transactions ordered by date and creation time
    const { data: transactions, error: fetchError } = await supabase
      .from("financial_transactions")
      .select("id, type, amount, transaction_date, created_at")
      .eq("organization_id", organizationId)
      .order("transaction_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError) throw fetchError;
    if (!transactions || transactions.length === 0) return;

    // Calculate running balance
    let runningBalance = 0;
    const updates = transactions.map((transaction) => {
      if (transaction.type === "income") {
        runningBalance += Number(transaction.amount);
      } else {
        runningBalance -= Number(transaction.amount);
      }

      return {
        id: transaction.id,
        balance_after: runningBalance,
      };
    });

    // Update all transactions with new balance_after values
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("financial_transactions")
        .update({ balance_after: update.balance_after })
        .eq("id", update.id);

      if (updateError) {
        console.error("Error updating balance for transaction:", update.id, updateError);
      }
    }
  },
};
