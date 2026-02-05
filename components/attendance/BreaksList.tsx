import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AttendanceBreak } from '@/lib/types';
import { formatTime } from '@/lib/utils/date.utils';
import { Colors, Spacing, BorderRadius, StatusColors } from '@/constants/theme';

interface BreaksListProps {
  breaks: AttendanceBreak[];
  onEdit?: (index: number, breakItem: AttendanceBreak) => void;
  onDelete?: (index: number) => void;
  editable?: boolean;
}

export default function BreaksList({ breaks, onEdit, onDelete, editable = false }: BreaksListProps) {
  if (!breaks || breaks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="coffee-outline" size={32} color={Colors.gray300} />
        <Text style={styles.emptyText}>No breaks recorded</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {breaks.map((breakItem, index) => {
        const startTime = new Date(breakItem.start_time);
        const endTime = new Date(breakItem.end_time);
        const hours = Math.floor(breakItem.duration_minutes / 60);
        const minutes = breakItem.duration_minutes % 60;

        return (
          <View key={index} style={styles.breakCard}>
            <View style={styles.breakHeader}>
              <View style={styles.breakIcon}>
                <MaterialCommunityIcons name="coffee" size={20} color={Colors.warning} />
              </View>
              <View style={styles.breakInfo}>
                <Text style={styles.breakTitle}>Break {index + 1}</Text>
                <Text style={styles.breakDuration}>
                  {hours > 0 && `${hours}h `}
                  {minutes}m
                </Text>
              </View>
              {editable && (
                <View style={styles.breakActions}>
                  {onEdit && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onEdit(index, breakItem)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Edit break ${index + 1}`}
                      accessibilityRole="button"
                      accessibilityHint="Opens editor to modify this break"
                    >
                      <Ionicons name="pencil" size={18} color={Colors.indigo} />
                    </TouchableOpacity>
                  )}
                  {onDelete && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => onDelete(index)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete break ${index + 1}`}
                      accessibilityRole="button"
                      accessibilityHint="Removes this break from the record"
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View style={styles.breakDetails}>
              <View style={styles.timeRow}>
                <Ionicons name="play-circle-outline" size={16} color={Colors.success} />
                <Text style={styles.timeLabel}>Start:</Text>
                <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="stop-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.timeLabel}>End:</Text>
                <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
              </View>
            </View>

            {breakItem.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Note:</Text>
                <Text style={styles.notesText}>{breakItem.notes}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray400,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  breakCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  breakIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: StatusColors.pending.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  breakInfo: {
    flex: 1,
  },
  breakTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  breakDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
  },
  breakActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: StatusColors.rejected.background,
  },
  breakDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeLabel: {
    fontSize: 13,
    color: Colors.gray500,
    fontWeight: '500',
    minWidth: 40,
  },
  timeValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  notesLabel: {
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: Colors.gray700,
    lineHeight: 18,
  },
});
