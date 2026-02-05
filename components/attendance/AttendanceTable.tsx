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
  calculateApprovedBreakHours,
  getAttendanceStatus,
} from '@/lib/utils/attendance.utils';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface AttendanceTableProps {
  data: AttendanceWithUser[];
  onEdit: (record: AttendanceRecord) => void;
  onAssignBreak?: (record: AttendanceWithUser) => void;
  sortField: SortField;
  sortOrder: SortOrder;
}

export type SortField = 'name' | 'checkIn' | 'checkOut' | 'hours';
export type SortOrder = 'asc' | 'desc';

// Helper to get initials from name
const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Present':
      return Colors.success;
    case 'Incomplete':
      return Colors.warning;
    case 'Absent':
    default:
      return Colors.error;
  }
};

// Helper to get row background tint based on status
const getRowTint = (status: string): string | undefined => {
  switch (status) {
    case 'Present':
      return 'rgba(34, 197, 94, 0.06)'; // Light green tint
    case 'Incomplete':
      return 'rgba(251, 191, 36, 0.06)'; // Light yellow tint
    case 'Absent':
      return 'rgba(239, 68, 68, 0.06)'; // Light red tint
    default:
      return undefined;
  }
};

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
      {sortedData.map((item, index) => {
        const status = getAttendanceStatus(item);
        const statusColor = getStatusColor(status);
        const rowTint = getRowTint(status);

        return (
          <View
            key={item.id}
            style={[
              styles.tableRow,
              index % 2 === 0 && styles.tableRowEven,
              rowTint && { backgroundColor: rowTint },
            ]}
          >
            <TouchableOpacity
              style={styles.mainRowContent}
              onPress={() => onEdit(item as AttendanceRecord)}
              activeOpacity={0.7}
            >
              {/* Avatar + Name + Status */}
              <View style={[styles.cell, styles.nameCell]}>
                <View style={styles.employeeInfo}>
                  {/* Avatar with initials */}
                  <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.avatarText, { color: statusColor }]}>
                      {getInitials(item.user?.full_name)}
                    </Text>
                    {/* Status dot */}
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  </View>
                  {/* Name and ID */}
                  <View style={styles.nameContainer}>
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {item.user?.full_name || 'Unknown'}
                    </Text>
                    {item.user?.employee_id && (
                      <Text style={styles.employeeId} numberOfLines={1}>
                        {item.user.employee_id}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Check-in */}
              <View style={[styles.cell, styles.timeCell]}>
                {item.check_in_time ? (
                  <Text style={styles.timeText}>
                    {formatTime(new Date(item.check_in_time))}
                  </Text>
                ) : (
                  <Text style={styles.timeTextMuted}>Not in</Text>
                )}
              </View>

              {/* Check-out */}
              <View style={[styles.cell, styles.timeCell]}>
                {item.check_out_time ? (
                  <Text style={styles.timeText}>
                    {formatTime(new Date(item.check_out_time))}
                  </Text>
                ) : item.check_in_time ? (
                  <Text style={styles.timeTextPending}>Working</Text>
                ) : (
                  <Text style={styles.timeTextMuted}>—</Text>
                )}
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
                              <MaterialCommunityIcons name="coffee-outline" size={12} color={Colors.warning} />
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
                  <Text style={styles.hoursTextMuted}>0h</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Actions */}
            {onAssignBreak && (
              <View style={styles.actionsCell}>
                {(() => {
                  const hasCheckedIn = !!item.check_in_time;
                  const hasCheckedOut = !!item.check_out_time;
                  const canAssignBreak = hasCheckedIn && !hasCheckedOut && item.is_valid_day;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        canAssignBreak ? styles.actionButtonActive : styles.actionButtonDisabled,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (canAssignBreak) {
                          onAssignBreak(item);
                        }
                      }}
                      disabled={!canAssignBreak}
                      activeOpacity={canAssignBreak ? 0.7 : 1}
                    >
                      <MaterialCommunityIcons
                        name="coffee"
                        size={16}
                        color={canAssignBreak ? Colors.warning : Colors.gray300}
                      />
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}
          </View>
        );
      })}
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
      return <Ionicons name="swap-vertical" size={12} color={Colors.textTertiary} />;
    }
    return (
      <Ionicons
        name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={12}
        color={Colors.primary}
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
        <Text style={styles.headerText}>Employee</Text>
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
        <Text style={styles.headerText}>Hrs</Text>
        <SortIcon field="hours" />
      </TouchableOpacity>

      {/* Empty space for actions column alignment */}
      <View style={styles.actionsHeaderCell} />
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrapper: {
    backgroundColor: Colors.backgroundSecondary,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  tableRowEven: {
    backgroundColor: Colors.background,
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
    flex: 2.5,
    paddingRight: Spacing.sm,
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
  // Employee info with avatar
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.backgroundSecondary,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  employeeName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  employeeId: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  timeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  timeTextMuted: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textTertiary,
  },
  timeTextPending: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.warning,
  },
  hoursText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  hoursTextMuted: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textTertiary,
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
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.warning,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overtimeSubtext: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.semibold,
    color: '#8B5CF6',
  },
  actionsCell: {
    paddingLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsHeaderCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: Colors.warning + '20',
  },
  actionButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.5,
  },
});
