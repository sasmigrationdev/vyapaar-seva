/**
 * Script to fix all balance_after values in financial_transactions table
 * Run this with: npx tsx scripts/fix-financial-balances.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateBalances(organizationId: string) {
  console.log(`\nRecalculating balances for organization: ${organizationId}`);

  // Fetch all transactions ordered by date and creation time
  const { data: transactions, error: fetchError } = await supabase
    .from('financial_transactions')
    .select('id, type, amount, transaction_date, created_at')
    .eq('organization_id', organizationId)
    .order('transaction_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching transactions:', fetchError);
    throw fetchError;
  }

  if (!transactions || transactions.length === 0) {
    console.log('No transactions found');
    return;
  }

  console.log(`Found ${transactions.length} transactions`);

  // Calculate running balance
  let runningBalance = 0;
  const updates = [];

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    if (transaction.type === 'income') {
      runningBalance += Number(transaction.amount);
    } else {
      runningBalance -= Number(transaction.amount);
    }

    updates.push({
      id: transaction.id,
      balance_after: runningBalance,
      date: transaction.transaction_date,
      type: transaction.type,
      amount: transaction.amount,
    });

    console.log(
      `${i + 1}. ${transaction.transaction_date} | ${transaction.type.padEnd(7)} | ₹${Number(transaction.amount).toLocaleString('en-IN').padStart(10)} | Balance: ₹${runningBalance.toLocaleString('en-IN')}`
    );
  }

  console.log(`\n\nFinal Balance: ₹${runningBalance.toLocaleString('en-IN')}`);
  console.log('\nUpdating database...');

  // Update all transactions with new balance_after values
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('financial_transactions')
      .update({ balance_after: update.balance_after })
      .eq('id', update.id);

    if (updateError) {
      console.error(`Error updating transaction ${update.id}:`, updateError);
    }
  }

  console.log('✓ All balances updated successfully!');

  // Verify the update
  const { data: verifyData } = await supabase
    .from('financial_transactions')
    .select('balance_after')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nVerified Current Balance: ₹${Number(verifyData?.balance_after || 0).toLocaleString('en-IN')}`);
}

async function main() {
  const organizationId = 'e1285fb4-d041-4452-8899-7337e8bca5b5';

  try {
    await recalculateBalances(organizationId);
    console.log('\n✓ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  }
}

main();
