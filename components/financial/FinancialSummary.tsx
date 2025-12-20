import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MonthlySummary } from '@/lib/types/financial.types';

interface FinancialSummaryProps {
  summary: MonthlySummary;
}

export default function FinancialSummary({ summary }: FinancialSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    return new Date(summary.year, month).toLocaleString('en-IN', { month: 'long' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getMonthName(summary.month)} {summary.year}</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="arrow-down" size={20} color="#10B981" />
            <Text style={styles.statLabel}>Income</Text>
          </View>
          <Text style={styles.incomeValue}>{formatCurrency(summary.totalIncome)}</Text>
        </View>

        <View style={[styles.statCard, styles.expenseCard]}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="arrow-up" size={20} color="#EF4444" />
            <Text style={styles.statLabel}>Expense</Text>
          </View>
          <Text style={styles.expenseValue}>{formatCurrency(summary.totalExpense)}</Text>
        </View>
      </View>

      <View style={[styles.balanceCard, summary.balance >= 0 ? styles.profitCard : styles.lossCard]}>
        <View style={styles.balanceHeader}>
          <MaterialCommunityIcons
            name={summary.balance >= 0 ? 'trending-up' : 'trending-down'}
            size={22}
            color={summary.balance >= 0 ? '#10B981' : '#EF4444'}
          />
          <Text style={styles.balanceLabel}>
            {summary.balance >= 0 ? 'Profit' : 'Loss'}
          </Text>
        </View>
        <Text style={[styles.balanceValue, summary.balance >= 0 ? styles.profitValue : styles.lossValue]}>
          {formatCurrency(Math.abs(summary.balance))}
        </Text>
        <Text style={styles.transactionCount}>
          {summary.transactionCount} transaction{summary.transactionCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  incomeCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  expenseCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  incomeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  expenseValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  balanceCard: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  profitCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  lossCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  profitValue: {
    color: '#10B981',
  },
  lossValue: {
    color: '#EF4444',
  },
  transactionCount: {
    fontSize: 13,
    color: '#64748B',
  },
});
