import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
  isLoading?: boolean;
}

const StatCard = ({ icon, value, label, color, bgColor, isLoading }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      {icon}
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color={color} style={styles.loader} />
    ) : (
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    )}
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

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
        <StatCard
          icon={<MaterialCommunityIcons name="clock-outline" size={20} color={Colors.info} />}
          value={formatHours(totalWorkingHours)}
          label="Total Hours"
          color={Colors.info}
          bgColor={Colors.info + '08'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<Ionicons name="calendar-outline" size={20} color={Colors.success} />}
          value={`${attendedDays}/${expectedDays}`}
          label="Days Attended"
          color={Colors.success}
          bgColor={Colors.success + '08'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<Feather name="umbrella" size={20} color={Colors.accent} />}
          value={leavesTaken}
          label="Leaves"
          color={Colors.accent}
          bgColor={Colors.accent + '08'}
          isLoading={isLoading}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <StatCard
          icon={<Ionicons name="close-circle-outline" size={20} color={Colors.error} />}
          value={absentDays}
          label="Absent"
          color={Colors.error}
          bgColor={Colors.error + '08'}
          isLoading={isLoading}
        />
        <StatCard
          icon={<MaterialCommunityIcons name="clock-plus-outline" size={20} color="#8B5CF6" />}
          value={formatHours(overtimeHours)}
          label="Overtime"
          color="#8B5CF6"
          bgColor="#8B5CF608"
          isLoading={isLoading}
        />
        {showEmployeeCount ? (
          <StatCard
            icon={<Ionicons name="people-outline" size={20} color={Colors.primary} />}
            value={employeeCount}
            label="Employees"
            color={Colors.primary}
            bgColor={Colors.primary + '08'}
            isLoading={isLoading}
          />
        ) : (
          <StatCard
            icon={<Ionicons name="trending-up-outline" size={20} color={getPercentageColor()} />}
            value={`${percentage}%`}
            label="Attendance"
            color={getPercentageColor()}
            bgColor={getPercentageColor() + '08'}
            isLoading={isLoading}
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
