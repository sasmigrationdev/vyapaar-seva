import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { FinancialTransaction } from '@/lib/types/financial.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TransactionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: FinancialTransaction | null;
  onDelete: (transactionId: string) => void;
  isDeleting: boolean;
}

export default function TransactionDetailModal({
  visible,
  onClose,
  transaction,
  onDelete,
  isDeleting,
}: TransactionDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { confirmDestructive } = useAlert();

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';

  const handleDelete = () => {
    confirmDestructive(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      () => onDelete(transaction.id)
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      bank: 'Bank Transfer',
      upi: 'UPI',
      card: 'Card',
      cheque: 'Cheque',
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      cash: 'cash',
      bank: 'bank',
      upi: 'cellphone',
      card: 'credit-card',
      cheque: 'checkbook',
    };
    return icons[method] || 'cash';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modalContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Transaction Details</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.deleteIconButton}
                  disabled={isDeleting}
                >
                  <MaterialCommunityIcons
                    name={isDeleting ? "loading" : "delete-outline"}
                    size={24}
                    color={Colors.error}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  disabled={isDeleting}
                >
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dragIndicator} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Type & Amount */}
            <View style={styles.amountSection}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: isIncome ? Colors.success + '20' : Colors.error + '20' }
              ]}>
                <MaterialCommunityIcons
                  name={isIncome ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={isIncome ? Colors.success : Colors.error}
                />
                <Text style={[
                  styles.typeBadgeText,
                  { color: isIncome ? Colors.success : Colors.error }
                ]}>
                  {isIncome ? 'Income' : 'Expense'}
                </Text>
              </View>
              <Text style={[
                styles.amount,
                { color: isIncome ? Colors.success : Colors.error }
              ]}>
                ₹{transaction.amount.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.categoryCard}>
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: transaction.category?.color || Colors.primary + '20' }
                ]}>
                  <MaterialCommunityIcons
                    name={(transaction.category?.icon as any) || 'tag'}
                    size={16}
                    color={transaction.category?.color || Colors.primary}
                  />
                </View>
                <Text style={styles.categoryName}>
                  {transaction.category?.name || 'Uncategorized'}
                </Text>
              </View>
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Transaction Date</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>{formatDate(transaction.transaction_date)}</Text>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Payment Method</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name={getPaymentMethodIcon(transaction.payment_method) as any}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.infoText}>
                  {getPaymentMethodLabel(transaction.payment_method)}
                </Text>
              </View>
            </View>

            {/* Reference Number */}
            {transaction.reference_number && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reference Number</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="pound" size={20} color={Colors.primary} />
                  <Text style={styles.infoText}>{transaction.reference_number}</Text>
                </View>
              </View>
            )}

            {/* Description */}
            {transaction.description && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.descriptionText}>{transaction.description}</Text>
              </View>
            )}

            {/* Notes */}
            {transaction.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.notesText}>{transaction.notes}</Text>
              </View>
            )}

            {/* Balance After */}
            {transaction.balance_after !== null && transaction.balance_after !== undefined && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Balance After Transaction</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="wallet" size={20} color={Colors.primary} />
                  <Text style={styles.infoText}>
                    ₹{transaction.balance_after.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            {/* Created By */}
            {transaction.created_by_user && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Created By</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account" size={20} color={Colors.primary} />
                  <Text style={styles.infoText}>{transaction.created_by_user.full_name}</Text>
                </View>
              </View>
            )}

            {/* Created At */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Created On</Text>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.textTertiary} />
                <Text style={styles.infoTextSecondary}>
                  {formatDate(transaction.created_at)} at {formatTime(transaction.created_at)}
                </Text>
              </View>
            </View>

            {/* Updated At */}
            {transaction.updated_at !== transaction.created_at && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Last Updated</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="update" size={20} color={Colors.textTertiary} />
                  <Text style={styles.infoTextSecondary}>
                    {formatDate(transaction.updated_at)} at {formatTime(transaction.updated_at)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '85%',
    ...Shadows.lg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.error + '10',
    marginRight: Spacing.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.gray100,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  typeBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginLeft: Spacing.xs,
  },
  amount: {
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  categoryName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
  infoTextSecondary: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
  descriptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: 22,
    backgroundColor: Colors.gray50,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    backgroundColor: Colors.gray50,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    fontStyle: 'italic',
  },
});
