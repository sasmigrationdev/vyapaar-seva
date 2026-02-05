import React, { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Animated, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors, PressOpacity, Spacing, BorderRadius, AnimationPresets } from '@/constants/theme';
import { FinancialTransaction } from '@/lib/types/financial.types';

interface TransactionCardProps {
  transaction: FinancialTransaction;
  onPress?: () => void;
}

function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: AnimationPresets.pressScale,
      damping: AnimationPresets.springConfig.damping,
      stiffness: AnimationPresets.springConfig.stiffness,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: AnimationPresets.springConfig.damping,
      stiffness: AnimationPresets.springConfig.stiffness,
      useNativeDriver: true,
    }).start();
  };

  const isIncome = transaction.type === 'income';

  const content = (
    <View style={styles.content}>
      <View style={[styles.iconContainer, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
        <MaterialCommunityIcons
          name={isIncome ? 'arrow-down' : 'arrow-up'}
          size={20}
          color={isIncome ? Colors.success : Colors.error}
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
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${transaction.type === 'income' ? 'Income' : 'Expense'}: ${transaction.description || transaction.category?.name || 'Transaction'}`}
      >
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          {content}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel={`${transaction.type === 'income' ? 'Income' : 'Expense'}: ${transaction.description || transaction.category?.name || 'Transaction'}`}
    >
      {content}
    </View>
  );
}

// Export memoized component for performance
export default React.memo(TransactionCard);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md + 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIcon: {
    backgroundColor: Colors.successLight,
  },
  expenseIcon: {
    backgroundColor: Colors.errorLight,
  },
  details: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  separator: {
    fontSize: 13,
    color: Colors.gray300,
    flexShrink: 0,
  },
  category: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: Spacing.sm,
  },
  incomeAmount: {
    color: Colors.success,
  },
  expenseAmount: {
    color: Colors.error,
  },
});
