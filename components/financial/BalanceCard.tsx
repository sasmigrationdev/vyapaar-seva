import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

interface BalanceCardProps {
  balance: number;
  isLoading?: boolean;
}

export default function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isPositive = balance >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="wallet"
          size={24}
          color={isPositive ? '#10B981' : '#EF4444'}
        />
        <Text style={styles.label}>Current Balance</Text>
      </View>

      {isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <Text
          style={[styles.amount, isPositive ? styles.positive : styles.negative]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {formatCurrency(balance)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#EF4444',
  },
  loading: {
    fontSize: 18,
    color: '#94A3B8',
  },
});
