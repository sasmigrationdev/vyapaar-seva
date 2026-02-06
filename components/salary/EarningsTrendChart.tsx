import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from '@/components/ui/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { formatCurrency } from '@/lib/utils/salary.utils';

interface MonthData {
  month: number;
  year: number;
  earnedSalary: number;
  totalHours: number;
}

interface EarningsTrendChartProps {
  data: MonthData[];
  isLoading?: boolean;
}

const CHART_HEIGHT = 100;
const BAR_MAX_HEIGHT = 80;

const AnimatedBar = ({
  value,
  maxValue,
  index,
  label,
  isCurrentMonth,
}: {
  value: number;
  maxValue: number;
  index: number;
  label: string;
  isCurrentMonth: boolean;
}) => {
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const barHeight = maxValue > 0 ? (value / maxValue) * BAR_MAX_HEIGHT : 0;
    height.value = withDelay(
      index * 100,
      withSpring(barHeight, { damping: 12, stiffness: 100 })
    );
    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 400 })
    );
  }, [value, maxValue, index, height, opacity]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const getBarColor = () => {
    if (isCurrentMonth) return Colors.primary;
    return Colors.info;
  };

  return (
    <View style={styles.barContainer}>
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: getBarColor() },
            isCurrentMonth && styles.barCurrent,
            barStyle,
          ]}
        />
      </View>
      <Text style={[styles.barLabel, isCurrentMonth && styles.barLabelCurrent]}>
        {label}
      </Text>
    </View>
  );
};

export default function EarningsTrendChart({
  data,
  isLoading = false,
}: EarningsTrendChartProps) {
  // Get last 6 months of data (or less if not available)
  const chartData = data.slice(0, 6).reverse();

  // Calculate max value for scaling
  const maxValue = Math.max(...chartData.map(d => d.earnedSalary), 1);

  // Calculate total and average
  const totalEarnings = chartData.reduce((sum, d) => sum + d.earnedSalary, 0);
  const avgEarnings = chartData.length > 0 ? totalEarnings / chartData.length : 0;

  const getMonthLabel = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short' }).substring(0, 3);
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading trend...</Text>
      </View>
    );
  }

  if (chartData.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No earnings history yet</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Earnings Trend</Text>
          <Text style={styles.subtitle}>Last {chartData.length} months</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg/month</Text>
            <Text style={styles.statValue}>{formatCurrency(avgEarnings)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        {/* Horizontal guide lines */}
        <View style={styles.guideLinesContainer}>
          <View style={styles.guideLine} />
          <View style={styles.guideLine} />
          <View style={styles.guideLine} />
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {chartData.map((item, index) => (
            <AnimatedBar
              key={`${item.year}-${item.month}`}
              value={item.earnedSalary}
              maxValue={maxValue}
              index={index}
              label={getMonthLabel(item.month)}
              isCurrentMonth={item.month === currentMonth && item.year === currentYear}
            />
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.info }]} />
          <Text style={styles.legendText}>Past months</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.legendText}>Current month</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  chartArea: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  guideLinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 16,
    justifyContent: 'space-between',
  },
  guideLine: {
    height: 1,
    backgroundColor: Colors.border,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 16,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 50,
  },
  barWrapper: {
    width: 28,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  barCurrent: {
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 6,
  },
  barLabelCurrent: {
    fontWeight: '700',
    color: Colors.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
