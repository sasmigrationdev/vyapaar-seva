import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSalaryHistoryByUserId } from '@/hooks/queries/useSalaryHistory';
import { formatCurrency } from '@/lib/utils/salary.utils';
import { formatDate } from '@/lib/utils/date.utils';

interface SalaryHistoryCardProps {
  userId: string;
}

export default function SalaryHistoryCard({ userId }: SalaryHistoryCardProps) {
  const { data: salaryHistory, isLoading } = useSalaryHistoryByUserId(userId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingText}>Loading salary history...</Text>
      </View>
    );
  }

  if (!salaryHistory || salaryHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>No salary history</Text>
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      {salaryHistory.map((entry, index) => {
        const effectiveFrom = entry.effective_from;
        const isPending = effectiveFrom > today;
        const isActive = effectiveFrom <= today && index === 0;

        return (
          <View key={entry.id} style={styles.historyItem}>
            {/* Timeline indicator */}
            <View style={styles.timeline}>
              <View
                style={[
                  styles.timelineDot,
                  isActive && styles.timelineDotActive,
                  isPending && styles.timelineDotPending,
                ]}
              />
              {index < salaryHistory.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.effectiveDate}>
                    {formatDate(new Date(effectiveFrom))}
                  </Text>
                  {isPending && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  )}
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeText}>Current</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Salary Change Details */}
              <View style={styles.salaryChange}>
                <View style={styles.salaryBox}>
                  <Text style={styles.salaryLabel}>Previous</Text>
                  <Text style={styles.oldSalary}>
                    {entry.old_salary ? formatCurrency(Number(entry.old_salary)) : 'N/A'}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="arrow-right-thick"
                  size={24}
                  color="#6366F1"
                  style={styles.arrow}
                />

                <View style={styles.salaryBox}>
                  <Text style={styles.salaryLabel}>New</Text>
                  <Text style={styles.newSalary}>
                    {formatCurrency(Number(entry.new_salary))}
                  </Text>
                </View>
              </View>

              {/* Additional Info */}
              {entry.change_reason && (
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={16} color="#6366F1" />
                  <Text style={styles.infoText}>{entry.change_reason}</Text>
                </View>
              )}

              {entry.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{entry.notes}</Text>
                </View>
              )}

              {entry.changedBy?.full_name ? (
                <Text style={styles.changedBy}>
                  Updated by {entry.changedBy.full_name}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeline: {
    width: 30,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    zIndex: 1,
  },
  timelineDotActive: {
    backgroundColor: '#10B981',
    borderColor: '#DCFCE7',
  },
  timelineDotPending: {
    backgroundColor: '#F59E0B',
    borderColor: '#FEF3C7',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  effectiveDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  salaryChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  salaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  salaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  oldSalary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  newSalary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  arrow: {
    marginHorizontal: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  changedBy: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
