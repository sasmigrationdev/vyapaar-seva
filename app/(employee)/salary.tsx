import { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCurrentMonthEarnings } from '@/hooks/queries/useEarnings';
import { formatCurrency } from '@/lib/utils/salary.utils';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import MonthlySlipsList from '@/components/salary/MonthlySlipsList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SalaryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || '';
  const [refreshing, setRefreshing] = useState(false);

  const { data: currentEarnings, isLoading, refetch } = useCurrentMonthEarnings(userId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const baseSalary = user?.base_salary || 0;
  const hourlyRate = user?.hourly_rate || 0;
  const earnedSalary = currentEarnings?.earned_salary || 0;
  const totalHoursWorked = currentEarnings?.total_hours_worked || 0;
  const expectedHours = currentEarnings?.expected_hours || 0;

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Modern Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Salary</Text>
            <Text style={styles.headerSubtitle}>{currentMonth}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <View style={styles.content}>

      {/* Salary Overview */}
      <View style={styles.groupedList}>
        <View style={styles.salaryItem}>
          <View style={styles.salaryItemLeft}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color={Colors.primary} />
            <View style={styles.salaryItemContent}>
              <Text style={styles.salaryLabel}>Monthly Base Salary</Text>
              <Text style={styles.salarySubtext}>Fixed monthly compensation</Text>
            </View>
          </View>
          <Text
            style={[styles.salaryValue, { color: Colors.primary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCurrency(baseSalary)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.salaryItem}>
          <View style={styles.salaryItemLeft}>
            <Ionicons name="time-outline" size={24} color={Colors.secondary} />
            <View style={styles.salaryItemContent}>
              <Text style={styles.salaryLabel}>Hourly Rate</Text>
              <Text style={styles.salarySubtext}>Current month rate</Text>
            </View>
          </View>
          <Text
            style={[styles.salaryValue, { color: Colors.secondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCurrency(hourlyRate)}/hr
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.earnedSection}>
          <View style={styles.earnedHeader}>
            <View style={styles.earnedHeaderLeft}>
              <MaterialCommunityIcons name="wallet-outline" size={24} color={Colors.success} />
              <Text style={styles.earnedLabel}>Earned This Month</Text>
            </View>
            <Text
              style={[styles.earnedValue, { color: Colors.success }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(earnedSalary)}
            </Text>
          </View>
          <View style={styles.earnedDetails}>
            <Text style={styles.earnedSubtext}>
              {totalHoursWorked.toFixed(1)} hrs worked
              {expectedHours > 0 && ` of ${expectedHours.toFixed(1)} hrs expected`}
            </Text>
            {expectedHours > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min((totalHoursWorked / expectedHours) * 100, 100)}%`,
                        backgroundColor: Colors.success,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentage}>
                  {Math.round((totalHoursWorked / expectedHours) * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Info Note */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
        <Text style={styles.infoText}>
          Your earned salary is calculated based on hours worked and your hourly rate. The final
          salary will be processed at the end of the month.
        </Text>
      </View>

      {/* Salary Slips Section */}
      <View style={styles.salarySlipsSection}>
        <Text style={styles.sectionTitle}>My Salary Slips</Text>
        <View style={styles.salarySlipsContainer}>
          <MonthlySlipsList userId={userId} />
        </View>
      </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing['xl'],
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    ...Shadows.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing['xl'],
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: Typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing['lg'],
    paddingBottom: 120,
  },
  groupedList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  salaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 72,
  },
  salaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  salaryItemContent: {
    flex: 1,
  },
  salaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs / 2,
  },
  salarySubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.fontWeight.regular,
  },
  salaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'right',
  },
  earnedSection: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  earnedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  earnedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  earnedLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  earnedValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  earnedDetails: {
    gap: Spacing.sm,
  },
  earnedSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.fontWeight.regular,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginRight: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressPercentage: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    minWidth: 40,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.info + '30',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    lineHeight: 18,
  },
  salarySlipsSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  salarySlipsContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.md,
  },
});