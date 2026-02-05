import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import CashbookActionBar from '@/components/financial/CashbookActionBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useVoiceTransactionExtraction } from '@/hooks/voice/useVoiceTransactionExtraction';
import { ExtractedTransactionData } from '@/constants/VoiceConfig';
import { formatForTransactionForm } from '@/hooks/voice/useVoiceTransactionExtraction';
import { FinancialTransaction } from '@/lib/types/financial.types';

type TransactionFilter = 'all' | 'income' | 'expense';

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

  // Filter and search state
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    if (!recentTransactions) return [];

    let filtered = [...recentTransactions];

    // Apply type filter
    if (transactionFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === transactionFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.category?.name?.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [recentTransactions, transactionFilter, searchQuery]);

  // Calculate category with most transactions
  const mostActiveCategory = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return null;

    const categoryCount: Record<string, { name: string; count: number }> = {};
    recentTransactions.forEach((t) => {
      if (t.category?.name) {
        if (!categoryCount[t.category.name]) {
          categoryCount[t.category.name] = { name: t.category.name, count: 0 };
        }
        categoryCount[t.category.name].count++;
      }
    });

    const sorted = Object.values(categoryCount).sort((a, b) => b.count - a.count);
    return sorted[0] || null;
  }, [recentTransactions]);

  // Calculate average transaction amount
  const avgTransactionAmount = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return 0;
    const total = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    return Math.round(total / recentTransactions.length);
  }, [recentTransactions]);

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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 160 }}
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
        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.headerSection}>
          {/* Header Row with Title and Settings */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Cash Book</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/(hr)/categories')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Month Navigation Row */}
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={previousMonth}
              style={styles.navButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.monthContainer}>
              {isCurrentMonth ? (
                <View style={styles.thisMonthBadge}>
                  <Text style={styles.thisMonthText}>This Month</Text>
                </View>
              ) : (
                <View style={styles.monthTextRow}>
                  <Text style={styles.monthMainText}>
                    {selectedDate.toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.jumpCurrentButton}
                    onPress={() => setSelectedDate(new Date())}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.jumpCurrentText}>Current</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={nextMonth}
              style={[styles.navButton, isCurrentMonth && styles.navButtonDisabled]}
              disabled={isCurrentMonth}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isCurrentMonth ? Colors.gray300 : Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            {loadingBalance ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text style={[styles.balanceAmount, balance && balance < 0 && styles.negativeBalance]}>
                ₹{balance?.toLocaleString('en-IN') || '0'}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Tappable Stats Grid - Acts as Filter */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {/* All Transactions */}
            <TouchableOpacity
              style={[
                styles.primaryStatCard,
                transactionFilter === 'all' && styles.statCardSelected,
              ]}
              onPress={() => setTransactionFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryStatValue}>
                {isLoadingData ? '—' : (recentTransactions?.length || 0)}
              </Text>
              <Text style={styles.primaryStatLabel}>All</Text>
            </TouchableOpacity>

            {/* Income */}
            <TouchableOpacity
              style={[
                styles.statCard,
                transactionFilter === 'income' && styles.statCardSelectedGreen,
                (summary?.totalIncome || 0) > 0 && transactionFilter !== 'income' && styles.statCardHighlight,
              ]}
              onPress={() => setTransactionFilter('income')}
              activeOpacity={0.7}
            >
              <View style={styles.statCardContent}>
                <View style={[styles.statIcon, transactionFilter === 'income' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: Colors.success + '15' }]}>
                  <Ionicons name="arrow-down" size={14} color={transactionFilter === 'income' ? Colors.textInverse : Colors.success} />
                </View>
                <View style={styles.statTextContent}>
                  <Text style={[styles.statLabel, transactionFilter === 'income' && styles.statLabelSelected]}>Income</Text>
                  <Text style={[styles.statValue, transactionFilter === 'income' && styles.statValueSelected]} numberOfLines={1}>
                    ₹{summary?.totalIncome?.toLocaleString('en-IN') || '0'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Expense */}
            <TouchableOpacity
              style={[
                styles.statCard,
                transactionFilter === 'expense' && styles.statCardSelectedRed,
                (summary?.totalExpense || 0) > 0 && transactionFilter !== 'expense' && styles.statCardAlertBg,
              ]}
              onPress={() => setTransactionFilter('expense')}
              activeOpacity={0.7}
            >
              <View style={styles.statCardContent}>
                <View style={[styles.statIcon, transactionFilter === 'expense' ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: Colors.error + '15' }]}>
                  <Ionicons name="arrow-up" size={14} color={transactionFilter === 'expense' ? Colors.textInverse : Colors.error} />
                </View>
                <View style={styles.statTextContent}>
                  <Text style={[styles.statLabel, transactionFilter === 'expense' && styles.statLabelSelected]}>Expense</Text>
                  <Text style={[styles.statValue, transactionFilter === 'expense' && styles.statValueSelected]} numberOfLines={1}>
                    ₹{summary?.totalExpense?.toLocaleString('en-IN') || '0'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Secondary Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Net Flow</Text>
              <Text style={[styles.infoValue, (summary?.balance || 0) < 0 && { color: Colors.error }]}>
                {isLoadingData ? '—' : `₹${summary?.balance?.toLocaleString('en-IN') || '0'}`}
              </Text>
            </View>

            {avgTransactionAmount > 0 && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Avg Txn</Text>
                  <Text style={styles.infoValue}>
                    ₹{avgTransactionAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </>
            )}

            {mostActiveCategory && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Top Category</Text>
                  <Text style={[styles.infoValue, { color: Colors.primary }]} numberOfLines={1}>
                    {mostActiveCategory.name}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textTertiary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {/* Active filter indicator */}
          {transactionFilter !== 'all' && (
            <TouchableOpacity
              style={styles.activeFilterBadge}
              onPress={() => setTransactionFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={styles.activeFilterText}>
                {transactionFilter === 'income' ? 'Income' : 'Expense'}
              </Text>
              <Ionicons name="close" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Transactions Section */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCount}>
                {filteredTransactions.length}
              </Text>
            </View>
          </View>

          {loadingTransactions ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : filteredTransactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((transaction, index) => (
                <Animated.View
                  key={transaction.id}
                  entering={FadeInDown.delay(300 + index * 30).springify()}
                >
                  <TransactionCard
                    transaction={transaction}
                    onPress={() => handleTransactionPress(transaction)}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt-text-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>
                {searchQuery || transactionFilter !== 'all'
                  ? 'No matching transactions'
                  : 'No transactions'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || transactionFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first transaction to get started'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Bar */}
      <CashbookActionBar
        onAddTransaction={() => setShowAddModal(true)}
        onVoiceInput={() => setShowVoiceRecording(true)}
        onOpenCategories={() => router.push('/(hr)/categories')}
        isVoiceLoading={voiceState.isLoading}
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
  // Header Section
  headerSection: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Month Navigation
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.4,
  },
  monthContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thisMonthBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  thisMonthText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  monthTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  monthMainText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  jumpCurrentButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  jumpCurrentText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  // Balance Section
  balanceSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  negativeBalance: {
    color: '#FEE2E2',
  },
  // Stats Section
  statsSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  primaryStatCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minWidth: 64,
  },
  primaryStatValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  primaryStatLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.9,
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContent: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textTertiary,
  },
  statLabelSelected: {
    color: Colors.textInverse,
    opacity: 0.9,
  },
  statValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statValueSelected: {
    color: Colors.textInverse,
  },
  statCardHighlight: {
    backgroundColor: Colors.success + '10',
  },
  statCardAlertBg: {
    backgroundColor: Colors.error + '10',
  },
  statCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  statCardSelectedGreen: {
    backgroundColor: Colors.success,
  },
  statCardSelectedRed: {
    backgroundColor: Colors.error,
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  activeFilterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  // Transactions Section
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
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
  sectionCountBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sectionCount: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  loadingCard: {
    padding: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
  },
  emptyState: {
    padding: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
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
});
