import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface AttendanceStatsCardsProps {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  averageHours: number;
  isLoading?: boolean;
}

export default function AttendanceStatsCards({
  totalEmployees,
  presentCount,
  absentCount,
  averageHours,
  isLoading = false,
}: AttendanceStatsCardsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={Colors.primary} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{isLoading ? '—' : totalEmployees}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{isLoading ? '—' : presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="close-circle" size={16} color="#EF4444" />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{isLoading ? '—' : absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color="#F59E0B" />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {isLoading ? '—' : `${averageHours.toFixed(1)}h`}
            </Text>
            <Text style={styles.statLabel}>Avg</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 20,
    paddingVertical: Spacing['lg'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['sm'],
    minWidth: 0,
    overflow: 'hidden',
  },
  statContent: {
    alignItems: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
});
