import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AttendanceBreak } from '@/lib/types';
import { formatTime } from '@/lib/utils/date.utils';

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
        <MaterialCommunityIcons name="coffee-outline" size={32} color="#CBD5E1" />
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
                <MaterialCommunityIcons name="coffee" size={20} color="#F59E0B" />
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
                    >
                      <Ionicons name="pencil" size={18} color="#6366F1" />
                    </TouchableOpacity>
                  )}
                  {onDelete && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => onDelete(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View style={styles.breakDetails}>
              <View style={styles.timeRow}>
                <Ionicons name="play-circle-outline" size={16} color="#10B981" />
                <Text style={styles.timeLabel}>Start:</Text>
                <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="stop-circle-outline" size={16} color="#EF4444" />
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
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '500',
  },
  breakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  breakInfo: {
    flex: 1,
  },
  breakTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  breakDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  breakActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  breakDetails: {
    gap: 8,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    minWidth: 40,
  },
  timeValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
});
