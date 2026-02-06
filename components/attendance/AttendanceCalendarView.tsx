import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { AttendanceRecord, LeaveRequest } from '@/lib/types';

// Calendar Colors
const CALENDAR_COLORS = {
  present: '#10B981',     // Green - successful attendance
  incomplete: '#F59E0B',  // Amber - checked in but not out
  absent: '#EF4444',      // Red - no attendance
  leave: '#0D9488',       // Teal - approved leave
  overtime: '#8B5CF6',    // Purple - has overtime
  weekend: '#E5E7EB',     // Gray - weekend
  future: '#F3F4F6',      // Light gray - future dates
  today: Colors.primary,  // Saffron - today
};

type DayStatus = 'present' | 'incomplete' | 'absent' | 'leave' | 'weekend' | 'future';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isFuture: boolean;
  status: DayStatus;
  record?: AttendanceRecord;
  hasOvertime: boolean;
}

interface AttendanceCalendarViewProps {
  year: number;
  month: number; // 0-indexed
  records: AttendanceRecord[];
  leaves?: LeaveRequest[];
  onDayPress: (day: CalendarDay) => void;
  isLoading?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarDayCell = React.memo(({
  day,
  onPress,
}: {
  day: CalendarDay;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  // Pulse animation for today
  React.useEffect(() => {
    if (day.isToday) {
      pulseOpacity.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [day.isToday, pulseOpacity]);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const getStatusColor = () => {
    if (day.isFuture) return CALENDAR_COLORS.future;
    if (day.isWeekend && day.status !== 'present') return CALENDAR_COLORS.weekend;
    return CALENDAR_COLORS[day.status];
  };

  const getTextColor = () => {
    if (!day.isCurrentMonth) return Colors.gray300;
    if (day.isFuture) return Colors.textTertiary;
    if (day.isWeekend && day.status !== 'present') return Colors.gray400;
    if (day.status === 'present' || day.status === 'leave') return '#FFF';
    if (day.status === 'incomplete') return '#92400E';
    if (day.status === 'absent') return '#FFF';
    return Colors.text;
  };

  if (!day.isCurrentMonth) {
    return <View style={styles.dayCell} />;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={day.isFuture}
      style={styles.dayCellWrapper}
      accessibilityLabel={`${day.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}, ${day.status}`}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.dayCell, animatedStyle]}>
        {/* Today pulse indicator */}
        {day.isToday && (
          <Animated.View
            style={[
              styles.todayPulse,
              { backgroundColor: Colors.primary + '40' },
              pulseStyle,
            ]}
          />
        )}

        {/* Day background */}
        <View
          style={[
            styles.dayBackground,
            { backgroundColor: getStatusColor() },
            day.isToday && styles.todayBackground,
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              { color: getTextColor() },
              day.isToday && styles.todayText,
            ]}
          >
            {day.dayNumber}
          </Text>

          {/* Overtime indicator dot */}
          {day.hasOvertime && (
            <View style={styles.overtimeDot} />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

// Legend component
const CalendarLegend = () => (
  <View style={styles.legend}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: CALENDAR_COLORS.present }]} />
      <Text style={styles.legendText}>Present</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: CALENDAR_COLORS.incomplete }]} />
      <Text style={styles.legendText}>Incomplete</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: CALENDAR_COLORS.absent }]} />
      <Text style={styles.legendText}>Absent</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: CALENDAR_COLORS.leave }]} />
      <Text style={styles.legendText}>Leave</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, styles.legendDotOvertime]} />
      <Text style={styles.legendText}>OT</Text>
    </View>
  </View>
);

export default function AttendanceCalendarView({
  year,
  month,
  records,
  leaves = [],
  onDayPress,
  isLoading = false,
}: AttendanceCalendarViewProps) {
  // Create a map of records by date for quick lookup
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach(record => {
      map.set(record.date, record);
    });
    return map;
  }, [records]);

  // Create a set of leave dates
  const leaveDatesSet = useMemo(() => {
    const set = new Set<string>();
    leaves
      .filter(l => l.status === 'approved')
      .forEach(leave => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(d.toISOString().split('T')[0]);
        }
      });
    return set;
  }, [leaves]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday

    const days: CalendarDay[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({
        date: new Date(year, month, -(startDay - i - 1)),
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isFuture: false,
        status: 'absent',
        hasOvertime: false,
      });
    }

    // Add days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;

      const record = recordsMap.get(dateStr);
      const isOnLeave = leaveDatesSet.has(dateStr);

      let status: DayStatus = 'absent';

      if (isFuture) {
        status = 'future';
      } else if (isOnLeave) {
        status = 'leave';
      } else if (record) {
        if (record.check_in_time && record.check_out_time) {
          status = 'present';
        } else if (record.check_in_time && !record.check_out_time) {
          status = 'incomplete';
        }
      } else if (!isWeekend) {
        status = 'absent';
      } else {
        status = 'weekend';
      }

      days.push({
        date,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        isWeekend,
        isFuture,
        status,
        record,
        hasOvertime: (record?.overtime_hours || 0) > 0,
      });
    }

    // Fill remaining cells to complete the grid (6 rows × 7 days = 42)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        isFuture: true,
        status: 'future',
        hasOvertime: false,
      });
    }

    return days;
  }, [year, month, recordsMap, leaveDatesSet]);

  const handleDayPress = useCallback((day: CalendarDay) => {
    onDayPress(day);
  }, [onDayPress]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, index) => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                (index === 0 || index === 6) && styles.weekendText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <CalendarDayCell
            key={`${day.date.toISOString()}-${index}`}
            day={day}
            onPress={() => handleDayPress(day)}
          />
        ))}
      </View>

      {/* Legend */}
      <CalendarLegend />
    </Animated.View>
  );
}

export type { CalendarDay };

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekendText: {
    color: Colors.gray400,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayBackground: {
    flex: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayBackground: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  todayPulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BorderRadius.lg,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayText: {
    fontWeight: '700',
  },
  overtimeDot: {
    position: 'absolute',
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: CALENDAR_COLORS.overtime,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotOvertime: {
    backgroundColor: CALENDAR_COLORS.overtime,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
