import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { AttendanceRecord } from '@/lib/types';

interface WeeklyHoursChartProps {
  records: AttendanceRecord[];
  expectedHoursPerDay?: number;
  isLoading?: boolean;
}

interface DayBar {
  dayLabel: string;
  hours: number;
  date: string;
  isToday: boolean;
}

const CHART_HEIGHT = 80;
const BAR_MAX_HEIGHT = 60;

const AnimatedBar = ({
  bar,
  index,
  maxHours
}: {
  bar: DayBar;
  index: number;
  maxHours: number;
}) => {
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const barHeight = maxHours > 0 ? (bar.hours / maxHours) * BAR_MAX_HEIGHT : 0;
    height.value = withDelay(
      index * 80,
      withSpring(barHeight, { damping: 12, stiffness: 100 })
    );
    opacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 300 })
    );
  }, [bar.hours, maxHours, index, height, opacity]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const getBarColor = () => {
    if (bar.hours === 0) return Colors.gray200;
    if (bar.hours >= 8) return Colors.success;
    if (bar.hours >= 6) return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.barContainer}>
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: getBarColor() },
            bar.isToday && styles.barToday,
            barStyle,
          ]}
        />
        {bar.hours > 0 && (
          <Text style={styles.barValue}>{bar.hours.toFixed(1)}</Text>
        )}
      </View>
      <Text style={[styles.barLabel, bar.isToday && styles.barLabelToday]}>
        {bar.dayLabel}
      </Text>
    </View>
  );
};

export default function WeeklyHoursChart({
  records,
  expectedHoursPerDay = 8,
  isLoading = false,
}: WeeklyHoursChartProps) {
  // Generate last 7 days data
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayBar[] = [];
    const recordsMap = new Map<string, AttendanceRecord>();

    // Create a map of records by date
    records.forEach(record => {
      recordsMap.set(record.date, record);
    });

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const record = recordsMap.get(dateStr);
      const hours = record?.total_hours || 0;

      days.push({
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        hours,
        date: dateStr,
        isToday: i === 0,
      });
    }

    return days;
  }, [records]);

  // Calculate max hours for scaling
  const maxHours = useMemo(() => {
    const maxFromData = Math.max(...chartData.map(d => d.hours), 0);
    return Math.max(maxFromData, expectedHoursPerDay, 10);
  }, [chartData, expectedHoursPerDay]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.hours, 0);
  }, [chartData]);

  // Calculate expected line position
  const expectedLinePosition = (expectedHoursPerDay / maxHours) * BAR_MAX_HEIGHT;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Last 7 Days</Text>
        <Text style={styles.totalHours}>{totalHours.toFixed(1)}h total</Text>
      </View>

      <View style={styles.chartArea}>
        {/* Expected hours line */}
        <View
          style={[
            styles.expectedLine,
            { bottom: expectedLinePosition + 16 } // 16 = label height
          ]}
        >
          <View style={styles.expectedLineDash} />
          <Text style={styles.expectedLineLabel}>{expectedHoursPerDay}h</Text>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {chartData.map((bar, index) => (
            <AnimatedBar
              key={bar.date}
              bar={bar}
              index={index}
              maxHours={maxHours}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    height: 140,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalHours: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  expectedLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  expectedLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.info + '50',
  },
  expectedLineLabel: {
    fontSize: 9,
    color: Colors.info,
    marginLeft: 4,
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_MAX_HEIGHT,
  },
  bar: {
    width: 24,
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  barToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  barValue: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: 2,
    position: 'absolute',
    top: -12,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  barLabelToday: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
