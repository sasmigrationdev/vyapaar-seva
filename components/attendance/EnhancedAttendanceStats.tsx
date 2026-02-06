import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeInUp,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { formatHours } from '@/lib/utils/attendance.utils';

interface EnhancedAttendanceStatsProps {
  totalWorkingHours: number;
  expectedDays: number;
  attendedDays: number;
  leavesTaken: number;
  absentDays: number;
  overtimeHours: number;
  attendancePercentage?: number;
  isLoading?: boolean;
  showEmployeeCount?: boolean;
  employeeCount?: number;
  animate?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
  isLoading?: boolean;
  index: number;
  animate?: boolean;
}

// Animated number counter hook
const useAnimatedNumber = (targetValue: number, animate: boolean, delay: number = 0) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    if (animate && !isNaN(targetValue)) {
      animatedValue.value = withDelay(
        delay,
        withTiming(targetValue, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      animatedValue.value = targetValue;
    }
  }, [targetValue, animate, delay, animatedValue]);

  return animatedValue;
};

const AnimatedStatCard = ({
  icon,
  value,
  label,
  color,
  bgColor,
  isLoading,
  index,
  animate = true,
}: StatCardProps) => {
  const scale = useSharedValue(animate ? 0.8 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      scale.value = withDelay(
        index * 100,
        withSpring(1, { damping: 12, stiffness: 100 })
      );
      opacity.value = withDelay(
        index * 100,
        withTiming(1, { duration: 300 })
      );
    }
  }, [animate, index, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.statCard, { backgroundColor: bgColor }, animatedStyle]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={color} style={styles.loader} />
      ) : (
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

export default function EnhancedAttendanceStats({
  totalWorkingHours,
  expectedDays,
  attendedDays,
  leavesTaken,
  absentDays,
  overtimeHours,
  attendancePercentage,
  isLoading = false,
  showEmployeeCount = false,
  employeeCount = 0,
  animate = true,
}: EnhancedAttendanceStatsProps) {
  const percentage = attendancePercentage ?? (expectedDays > 0
    ? Math.round((attendedDays / expectedDays) * 100)
    : 0);

  const getPercentageColor = () => {
    if (percentage >= 90) return Colors.success;
    if (percentage >= 70) return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <AnimatedStatCard
          icon={<MaterialCommunityIcons name="clock-outline" size={20} color={Colors.info} />}
          value={formatHours(totalWorkingHours)}
          label="Total Hours"
          color={Colors.info}
          bgColor={Colors.info + '08'}
          isLoading={isLoading}
          index={0}
          animate={animate}
        />
        <AnimatedStatCard
          icon={<Ionicons name="calendar-outline" size={20} color={Colors.success} />}
          value={`${attendedDays}/${expectedDays}`}
          label="Days Attended"
          color={Colors.success}
          bgColor={Colors.success + '08'}
          isLoading={isLoading}
          index={1}
          animate={animate}
        />
        <AnimatedStatCard
          icon={<Feather name="umbrella" size={20} color={Colors.accent} />}
          value={leavesTaken}
          label="Leaves"
          color={Colors.accent}
          bgColor={Colors.accent + '08'}
          isLoading={isLoading}
          index={2}
          animate={animate}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <AnimatedStatCard
          icon={<Ionicons name="close-circle-outline" size={20} color={Colors.error} />}
          value={absentDays}
          label="Absent"
          color={Colors.error}
          bgColor={Colors.error + '08'}
          isLoading={isLoading}
          index={3}
          animate={animate}
        />
        <AnimatedStatCard
          icon={<MaterialCommunityIcons name="clock-plus-outline" size={20} color="#8B5CF6" />}
          value={formatHours(overtimeHours)}
          label="Overtime"
          color="#8B5CF6"
          bgColor="#8B5CF608"
          isLoading={isLoading}
          index={4}
          animate={animate}
        />
        {showEmployeeCount ? (
          <AnimatedStatCard
            icon={<Ionicons name="people-outline" size={20} color={Colors.primary} />}
            value={employeeCount}
            label="Employees"
            color={Colors.primary}
            bgColor={Colors.primary + '08'}
            isLoading={isLoading}
            index={5}
            animate={animate}
          />
        ) : (
          <AnimatedStatCard
            icon={<Ionicons name="trending-up-outline" size={20} color={getPercentageColor()} />}
            value={`${percentage}%`}
            label="Attendance"
            color={getPercentageColor()}
            bgColor={getPercentageColor() + '08'}
            isLoading={isLoading}
            index={5}
            animate={animate}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  loader: {
    height: 24,
  },
});
