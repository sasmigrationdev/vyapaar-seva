import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCurrentMonthEarnings } from '@/hooks/queries/useEarnings';
import { formatCurrency } from '@/lib/utils/salary.utils';
import { getAvailableMonths } from '@/lib/utils/salarySlip.utils';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/constants/theme';
import MonthlySlipsList from '@/components/salary/MonthlySlipsList';
import EarningsProgressRing from '@/components/salary/EarningsProgressRing';
import EarningsTrendChart from '@/components/salary/EarningsTrendChart';
import AnimatedSalaryCard, { CompactSalaryCard } from '@/components/salary/AnimatedSalaryCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';

interface MonthData {
  month: number;
  year: number;
  totalHours: number;
  earnedSalary: number;
}

export default function SalaryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || '';
  const [refreshing, setRefreshing] = useState(false);
  const [trendData, setTrendData] = useState<MonthData[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const { data: currentEarnings, isLoading, refetch } = useCurrentMonthEarnings(userId);

  // Load trend data
  useEffect(() => {
    loadTrendData();
  }, [userId]);

  const loadTrendData = async () => {
    if (!userId) return;
    try {
      setTrendLoading(true);
      const data = await getAvailableMonths(userId);
      setTrendData(data);
    } catch (err) {
      console.error('Error loading trend data:', err);
    } finally {
      setTrendLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), loadTrendData()]);
    } finally {
      setRefreshing(false);
    }
  };

  const baseSalary = user?.base_salary || 0;
  const hourlyRate = user?.hourly_rate || 0;
  const earnedSalary = currentEarnings?.earned_salary || 0;
  const totalHoursWorked = currentEarnings?.total_hours_worked || 0;
  const expectedHours = currentEarnings?.expected_hours || 0;
  const expectedSalary = expectedHours > 0 ? (expectedHours * hourlyRate) : baseSalary;

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Modern Gradient Header */}
      <LinearGradient
        colors={Gradients.saffronHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Salary</Text>
            <View style={styles.headerDatePill}>
              <MaterialCommunityIcons name="calendar-month" size={14} color={Colors.textInverse} />
              <Text style={styles.headerSubtitle}>{currentMonth}</Text>
            </View>
          </View>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="wallet" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <View style={styles.content}>
          {/* Earnings Progress Ring */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <EarningsProgressRing
              earned={earnedSalary}
              expected={expectedSalary}
              hoursWorked={totalHoursWorked}
              expectedHours={expectedHours}
              isLoading={isLoading}
            />
          </Animated.View>

          {/* Salary Cards Grid */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardsGrid}>
            <CompactSalaryCard
              icon={<MaterialCommunityIcons name="cash-multiple" size={20} color={Colors.primary} />}
              label="Base Salary"
              value={baseSalary}
              color={Colors.primary}
              index={0}
            />
            <CompactSalaryCard
              icon={<Ionicons name="time-outline" size={20} color={Colors.secondary} />}
              label="Hourly Rate"
              value={hourlyRate}
              color={Colors.secondary}
              index={1}
              formatValue={(v) => `${formatCurrency(v)}/hr`}
            />
          </Animated.View>

          {/* Earnings Trend Chart */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <EarningsTrendChart
              data={trendData}
              isLoading={trendLoading}
            />
          </Animated.View>

          {/* Info Note */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              Your earned salary is calculated based on hours worked and your hourly rate. The final
              salary will be processed at the end of the month.
            </Text>
          </Animated.View>

          {/* Salary Slips Section */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.salarySlipsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Salary Slips</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {trendData.length} available
                </Text>
              </View>
            </View>
            <MonthlySlipsList userId={userId} />
          </Animated.View>
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
    paddingBottom: Spacing['xl'],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
    ...Shadows.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing['xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  headerDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.semibold,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing['xl'],
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
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
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionBadge: {
    backgroundColor: Colors.indigo + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.indigo,
  },
});
