import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCurrentBalance, useTransactions, useMonthlySummary } from '@/hooks/queries/useFinancial';
import { useAddTransaction, useDeleteTransaction } from '@/hooks/mutations/useFinancialMutations';
import TransactionCard from '@/components/financial/TransactionCard';
import AddTransactionModal from '@/components/financial/AddTransactionModal';
import EditTransactionModal from '@/components/financial/EditTransactionModal';
import TransactionDetailModal from '@/components/financial/TransactionDetailModal';
import VoiceRecordingModal from '@/components/financial/VoiceRecordingModal';
import VoiceConfirmationModal from '@/components/financial/VoiceConfirmationModal';
import VoiceCaptureButton from '@/components/financial/VoiceCaptureButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useVoiceTransactionExtraction } from '@/hooks/voice/useVoiceTransactionExtraction';
import { ExtractedTransactionData } from '@/constants/VoiceConfig';
import { formatForTransactionForm } from '@/hooks/voice/useVoiceTransactionExtraction';
import { FinancialTransaction } from '@/lib/types/financial.types';

export default function FinancialScreen() {
  const { user, loading: isLoadingAuth } = useAuth();
  const { success, error } = useAlert();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Voice input state
  const [showVoiceRecording, setShowVoiceRecording] = useState(false);
  const [showVoiceConfirmation, setShowVoiceConfirmation] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'en' | 'hi'>('en');
  const [voiceExtractionResult, setVoiceExtractionResult] = useState<{
    extractedData: ExtractedTransactionData;
    categoryMatch: any;
    transcribedText: string;
  } | null>(null);

  // Voice extraction hook
  const { state: voiceState, extractTransaction } = useVoiceTransactionExtraction(
    user?.organization_id || ''
  );

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(now);
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const { data: balance, isLoading: loadingBalance } = useCurrentBalance(
    user?.organization_id || '',
    { enabled: !!user?.organization_id }
  );

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useMonthlySummary(
    user?.organization_id || '',
    currentMonth,
    currentYear,
    { enabled: !!user?.organization_id }
  );

  const { data: recentTransactions, isLoading: loadingTransactions, refetch: refetchTransactions } = useTransactions(
    user?.organization_id || '',
    {
      startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
      endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
    },
    { enabled: !!user?.organization_id }
  );

  const addTransactionMutation = useAddTransaction(user?.organization_id || '', {
    onSuccess: () => {
      setShowAddModal(false);
    },
  });

  const deleteTransactionMutation = useDeleteTransaction(user?.organization_id || '', {
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedTransaction(null);
      success('Success', 'Transaction deleted successfully');
    },
    onError: (err) => {
      error('Error', 'Failed to delete transaction. Please try again.');
      console.error('[FinancialScreen] Delete transaction error:', err);
    },
  });

  const handleAddTransaction = (data: any) => {
    addTransactionMutation.mutate({
      ...data,
      createdBy: user?.id || '',
    });
  };

  const handleTransactionPress = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransactionMutation.mutate(transactionId);
  };

  // Voice input handlers
  const handleVoiceRecordingComplete = async (audioUri: string, duration: number) => {
    setShowVoiceRecording(false);

    if (!user?.id || !user?.organization_id) {
      error('Error', 'User information not found');
      return;
    }

    try {
      const result = await extractTransaction({
        audioUri,
        language: voiceLanguage,
        organizationId: user.organization_id,
        createdBy: user.id,
        autoCreateCategory: true,
      });

      if (result) {
        setVoiceExtractionResult(result);
        setShowVoiceConfirmation(true);
      } else {
        error('Error', 'Failed to extract transaction from voice input. Please try again.');
      }
    } catch (err) {
      console.error('[FinancialScreen] Voice extraction error:', err);
      error('Error', 'Failed to process voice input. Please try again.');
    }
  };

  const handleVoiceConfirm = () => {
    if (!voiceExtractionResult) return;

    const formData = formatForTransactionForm(voiceExtractionResult);

    // If no category ID, open the add modal with prefilled data
    if (!formData.categoryId) {
      setShowVoiceConfirmation(false);
      setShowAddModal(true);
      // TODO: Implement prefilling AddTransactionModal with voice data
      return;
    }

    // Submit directly
    addTransactionMutation.mutate(
      {
        type: formData.type,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        transactionDate: formData.transactionDate,
        description: formData.description,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber,
        createdBy: user?.id || '',
      },
      {
        onSuccess: () => {
          setShowVoiceConfirmation(false);
          setVoiceExtractionResult(null);
          success('Success', 'Transaction added successfully!');
        },
        onError: (err) => {
          error('Error', 'Failed to add transaction. Please try again.');
          console.error('[FinancialScreen] Add transaction error:', err);
        },
      }
    );
  };

  const handleVoiceEdit = () => {
    setShowVoiceConfirmation(false);
    setShowEditModal(true);
  };

  const previousMonth = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    const isCurrentMonth =
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    if (!isCurrentMonth) {
      setSelectedDate((prev) => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSummary(), refetchTransactions()]);
    } finally {
      setRefreshing(false);
    }
  };

  const isCurrentMonth =
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  const isLoadingData = loadingBalance || loadingSummary || loadingTransactions;

  // Show loading state while auth is initializing
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Only show error if auth has completed and user has no organization
  if (!user?.organization_id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No organization found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Cash Book</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/(hr)/categories')}
            >
              <MaterialCommunityIcons name="cog" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={previousMonth}
              style={styles.monthButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.monthTextContainer}>
              <MaterialCommunityIcons
                name="calendar-month"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.monthText}>
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <TouchableOpacity
              onPress={nextMonth}
              style={[styles.monthButton, isCurrentMonth && styles.monthButtonDisabled]}
              disabled={isCurrentMonth}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isCurrentMonth ? Colors.gray300 : Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance & Summary Section */}
        <View style={styles.summaryContainer}>
          {/* Current Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            {loadingBalance ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={[styles.balanceAmount, balance && balance < 0 && styles.negativeBalance]}>
                ₹{balance?.toLocaleString('en-IN') || '0'}
              </Text>
            )}
          </View>

          {/* Monthly Stats */}
          {isLoadingData ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : summary ? (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.success + '20' }]}>
                  <Ionicons name="arrow-down" size={16} color={Colors.success} />
                </View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={styles.statValue} numberOfLines={1}>₹{summary.totalIncome?.toLocaleString('en-IN') || '0'}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.error + '20' }]}>
                  <Ionicons name="arrow-up" size={16} color={Colors.error} />
                </View>
                <Text style={styles.statLabel}>Expense</Text>
                <Text style={styles.statValue} numberOfLines={1}>₹{summary.totalExpense?.toLocaleString('en-IN') || '0'}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.statLabel}>Net Flow</Text>
                <Text style={[styles.statValue, (summary.balance || 0) < 0 && styles.negativeText]} numberOfLines={1}>
                  ₹{summary.balance?.toLocaleString('en-IN') || '0'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.sectionCount}>
              {recentTransactions?.length || 0}
            </Text>
          </View>

          {loadingTransactions ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {recentTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onPress={() => handleTransactionPress(transaction)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt-text-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>No transactions</Text>
              <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 60 + (insets.bottom > 0 ? insets.bottom : 0) + Spacing['lg'] }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Voice Input FAB */}
      <VoiceCaptureButton
        variant="fab"
        onPress={() => setShowVoiceRecording(true)}
        isLoading={voiceState.isLoading}
        style={[styles.voiceFab, { bottom: 60 + (insets.bottom > 0 ? insets.bottom : 0) + Spacing['lg'] + 70 }]}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTransaction}
        organizationId={user?.organization_id || ''}
        isSubmitting={addTransactionMutation.isPending}
        onVoiceInput={() => {
          setShowAddModal(false);
          setShowVoiceRecording(true);
        }}
      />

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        visible={showVoiceRecording}
        onClose={() => setShowVoiceRecording(false)}
        onRecordingComplete={handleVoiceRecordingComplete}
        language={voiceLanguage}
        onLanguageChange={setVoiceLanguage}
      />

      {/* Voice Confirmation Modal */}
      {voiceExtractionResult && (
        <VoiceConfirmationModal
          visible={showVoiceConfirmation}
          onClose={() => {
            setShowVoiceConfirmation(false);
            setVoiceExtractionResult(null);
          }}
          extractedData={voiceExtractionResult.extractedData}
          categoryMatch={voiceExtractionResult.categoryMatch}
          transcribedText={voiceExtractionResult.transcribedText}
          onConfirm={handleVoiceConfirm}
          onEdit={handleVoiceEdit}
          isSubmitting={addTransactionMutation.isPending}
          language={voiceLanguage}
        />
      )}

      {/* Edit Transaction Modal (for voice input) */}
      {voiceExtractionResult && (
        <EditTransactionModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setVoiceExtractionResult(null);
          }}
          onSubmit={(data) => {
            handleAddTransaction(data);
            setShowEditModal(false);
            setVoiceExtractionResult(null);
          }}
          organizationId={user?.organization_id || ''}
          isSubmitting={addTransactionMutation.isPending}
          initialData={{
            ...formatForTransactionForm(voiceExtractionResult),
            transcribedText: voiceExtractionResult.transcribedText,
            confidence: voiceExtractionResult.extractedData.confidence,
          }}
        />
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onDelete={handleDeleteTransaction}
        isDeleting={deleteTransactionMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.5,
  },
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  monthText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  negativeBalance: {
    color: Colors.error,
  },
  loadingState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    minWidth: 0,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  negativeText: {
    color: Colors.error,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionCount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  loadingCard: {
    padding: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyState: {
    padding: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.fontSize.md,
    color: Colors.error,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    elevation: 8,
  },
  voiceFab: {
    position: 'absolute',
    right: 24,
  },
});
