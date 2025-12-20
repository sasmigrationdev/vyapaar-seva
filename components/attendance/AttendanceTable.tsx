import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AttendanceWithUser, AttendanceRecord } from '@/lib/types';
import { formatTime } from '@/lib/utils/date.utils';
import {
  formatHours,
  calculateApprovedBreakHours
} from '@/lib/utils/attendance.utils';

interface AttendanceTableProps {
  data: AttendanceWithUser[];
  onEdit: (record: AttendanceRecord) => void;
  onAssignBreak?: (record: AttendanceWithUser) => void;
  sortField: SortField;
  sortOrder: SortOrder;
}

export type SortField = 'name' | 'checkIn' | 'checkOut' | 'hours';
export type SortOrder = 'asc' | 'desc';

export default function AttendanceTable({ data, onEdit, onAssignBreak, sortField, sortOrder }: AttendanceTableProps) {

  const sortedData = [...data].sort((a, b) => {
    let compareA: any;
    let compareB: any;

    switch (sortField) {
      case 'name':
        compareA = a.user?.full_name?.toLowerCase() || '';
        compareB = b.user?.full_name?.toLowerCase() || '';
        break;
      case 'checkIn':
        compareA = a.check_in_time || '';
        compareB = b.check_in_time || '';
        break;
      case 'checkOut':
        compareA = a.check_out_time || '';
        compareB = b.check_out_time || '';
        break;
      case 'hours':
        compareA = a.total_hours || 0;
        compareB = b.total_hours || 0;
        break;
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <View style={styles.tableWrapper}>
      {sortedData.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.tableRow,
            index % 2 === 0 && styles.tableRowEven,
          ]}
        >
          <TouchableOpacity
            style={styles.mainRowContent}
            onPress={() => onEdit(item as AttendanceRecord)}
            activeOpacity={0.7}
          >
            {/* Name */}
            <View style={[styles.cell, styles.nameCell]}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {item.user?.full_name || 'Unknown'}
              </Text>
            </View>

            {/* Check-in */}
            <View style={[styles.cell, styles.timeCell]}>
              <Text style={styles.timeText}>
                {item.check_in_time ? formatTime(new Date(item.check_in_time)) : '--:--'}
              </Text>
            </View>

            {/* Check-out */}
            <View style={[styles.cell, styles.timeCell]}>
              <Text style={styles.timeText}>
                {item.check_out_time ? formatTime(new Date(item.check_out_time)) : '--:--'}
              </Text>
            </View>

            {/* Hours */}
            <View style={[styles.cell, styles.hoursCell]}>
              {item.total_hours ? (
                (() => {
                  const breakRequests = item.break_requests || [];
                  const approvedBreakHours = calculateApprovedBreakHours(breakRequests);
                  const hasApprovedBreaks = approvedBreakHours > 0;
                  const overtimeHours = item.overtime_hours || 0;
                  const hasOvertime = overtimeHours > 0;
                  // total_hours already has breaks deducted and overtime added by database
                  // Show base hours (without overtime) to avoid confusion
                  const baseHours = item.total_hours - overtimeHours;

                  if (hasApprovedBreaks || hasOvertime) {
                    return (
                      <View style={styles.hoursWithBreakContainer}>
                        <View style={styles.hoursRow}>
                          <Text style={styles.hoursText}>
                            {formatHours(baseHours)}
                          </Text>
                          {hasApprovedBreaks && (
                            <MaterialCommunityIcons name="coffee-outline" size={12} color="#F59E0B" />
                          )}
                          {hasOvertime && (
                            <MaterialCommunityIcons name="clock-plus-outline" size={12} color="#8B5CF6" />
                          )}
                        </View>
                        <View style={styles.subtextRow}>
                          {hasApprovedBreaks && (
                            <Text style={styles.breakSubtext}>
                              -{formatHours(approvedBreakHours)}
                            </Text>
                          )}
                          {hasOvertime && (
                            <Text style={styles.overtimeSubtext}>
                              +{formatHours(overtimeHours)} OT
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  }

                  return (
                    <Text style={styles.hoursText}>
                      {formatHours(item.total_hours)}
                    </Text>
                  );
                })()
              ) : (
                <Text style={styles.hoursText}>--</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Actions */}
          {onAssignBreak && (
            <View style={styles.actionsCell}>
              {(() => {
                const hasCheckedIn = !!item.check_in_time;
                const hasCheckedOut = !!item.check_out_time;
                const isDisabled = !hasCheckedIn || hasCheckedOut || !item.is_valid_day;

                return (
                  <TouchableOpacity
                    style={[
                      styles.assignBreakButton,
                      isDisabled && styles.assignBreakButtonDisabled,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!isDisabled) {
                        onAssignBreak(item);
                      }
                    }}
                    disabled={isDisabled}
                    activeOpacity={isDisabled ? 1 : 0.7}
                  >
                    <MaterialCommunityIcons
                      name="coffee"
                      size={16}
                      color={isDisabled ? '#94A3B8' : '#F59E0B'}
                    />
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// Export header as a separate component
export function AttendanceTableHeader({
  sortField,
  sortOrder,
  onSort,
}: {
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <Ionicons name="swap-vertical" size={14} color="#94A3B8" />;
    }
    return (
      <Ionicons
        name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={14}
        color="#6366F1"
      />
    );
  };

  return (
    <View style={styles.tableHeader}>
      <TouchableOpacity
        style={[styles.headerCell, styles.nameCell]}
        onPress={() => onSort('name')}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>Name</Text>
        <SortIcon field="name" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerCell, styles.timeCell]}
        onPress={() => onSort('checkIn')}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>In</Text>
        <SortIcon field="checkIn" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerCell, styles.timeCell]}
        onPress={() => onSort('checkOut')}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>Out</Text>
        <SortIcon field="checkOut" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerCell, styles.hoursCell]}
        onPress={() => onSort('hours')}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>Hours</Text>
        <SortIcon field="hours" />
      </TouchableOpacity>

      {/* Actions header (non-sortable) */}
      <View style={[styles.headerCell, styles.actionsHeaderCell]}>
        <Text style={styles.headerText}>Actions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrapper: {
    backgroundColor: '#F8FAFC',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  mainRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
  },
  nameCell: {
    flex: 2,
    paddingRight: 8,
    justifyContent: 'flex-start',
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  hoursText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
  },
  hoursWithBreakContainer: {
    alignItems: 'center',
    gap: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakSubtext: {
    fontSize: 9,
    fontWeight: '600',
    color: '#F59E0B',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overtimeSubtext: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  actionsCell: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsHeaderCell: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBreakButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  assignBreakButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
});
