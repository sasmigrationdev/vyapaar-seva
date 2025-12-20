import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { FinancialTransaction } from '@/lib/types/financial.types';

interface TransactionCardProps {
  transaction: FinancialTransaction;
  onPress?: () => void;
}

export default function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
          <MaterialCommunityIcons
            name={isIncome ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={isIncome ? '#10B981' : '#EF4444'}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description || transaction.category?.name || 'Transaction'}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.date} numberOfLines={1}>{formatDate(transaction.transaction_date)}</Text>
            {transaction.category && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.category} numberOfLines={1}>{transaction.category.name}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={[styles.amount, isIncome ? styles.incomeAmount : styles.expenseAmount]} numberOfLines={1}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIcon: {
    backgroundColor: '#D1FAE5',
  },
  expenseIcon: {
    backgroundColor: '#FEE2E2',
  },
  details: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  date: {
    fontSize: 13,
    color: '#64748B',
    flexShrink: 0,
  },
  separator: {
    fontSize: 13,
    color: '#CBD5E1',
    flexShrink: 0,
  },
  category: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: 8,
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
});
