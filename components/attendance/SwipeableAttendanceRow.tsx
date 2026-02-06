import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import Animated, {
  FadeInRight,
  FadeInLeft,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, StatusColors } from '@/constants/theme';
import { AttendanceRecord, OvertimeRequest } from '@/lib/types';
import { formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';

interface SwipeableAttendanceRowProps {
  item: AttendanceRecord;
  index: number;
  isExpanded: boolean;
  overtimeRequest?: OvertimeRequest;
  onToggleExpand: () => void;
  onRequestOvertime: () => void;
}

export default function SwipeableAttendanceRow({
  item,
  index,
  isExpanded,
  overtimeRequest,
  onToggleExpand,
  onRequestOvertime,
}: SwipeableAttendanceRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const date = new Date(item.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });

  const hasOvertimeContent = (item.overtime_hours || 0) > 0 || overtimeRequest;
  const hasExpandableContent = item.notes || hasOvertimeContent || (item.check_in_time && item.check_out_time);
  const canRequestOvertime = item.check_in_time && item.check_out_time && !overtimeRequest && (item.overtime_hours || 0) === 0;

  const handleSwipeAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onRequestOvertime();
  };

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    if (!canRequestOvertime) return null;

    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View
        style={[
          styles.swipeAction,
          {
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <RectButton style={styles.swipeActionButton} onPress={handleSwipeAction}>
          <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.textInverse} />
          <Text style={styles.swipeActionText}>OT</Text>
        </RectButton>
      </RNAnimated.View>
    );
  };

  const renderOvertimeStatus = () => {
    if (overtimeRequest?.status === 'pending') {
      return (
        <View style={styles.expandedOvertimePending}>
          <View style={styles.expandedOvertimeHeader}>
            <View style={styles.pulseDotOrange} />
            <Text style={styles.expandedOvertimePendingLabel}>Waiting for Approval</Text>
          </View>
          <View style={styles.expandedOvertimeRow}>
            <MaterialCommunityIcons name="clock-plus-outline" size={16} color={Colors.warning} />
            <Text style={styles.expandedOvertimePendingHours}>
              {formatHours(overtimeRequest.requested_hours)} requested
            </Text>
          </View>
          {overtimeRequest.reason && (
            <Text style={styles.expandedOvertimeReason}>{overtimeRequest.reason}</Text>
          )}
        </View>
      );
    }

    if (overtimeRequest?.status === 'rejected') {
      return (
        <View style={styles.expandedOvertimeRejected}>
          <View style={styles.expandedOvertimeHeader}>
            <Ionicons name="close-circle" size={14} color={Colors.error} />
            <Text style={styles.expandedOvertimeRejectedLabel}>Request Rejected</Text>
          </View>
          <Text style={styles.expandedOvertimeRejectedHours}>
            {formatHours(overtimeRequest.requested_hours)} was requested
          </Text>
          {overtimeRequest.reviewer_notes && (
            <Text style={styles.expandedOvertimeRejectedNote}>
              Note: {overtimeRequest.reviewer_notes}
            </Text>
          )}
        </View>
      );
    }

    if ((item.overtime_hours || 0) > 0) {
      return (
        <View style={styles.expandedOvertimeApproved}>
          <View style={styles.expandedOvertimeHeader}>
            <MaterialCommunityIcons name="clock-plus-outline" size={14} color={Colors.purple} />
            <Text style={styles.expandedOvertimeApprovedLabel}>Overtime Approved</Text>
          </View>
          <Text style={styles.expandedOvertimeApprovedHours}>
            {formatHours(item.overtime_hours || 0)}
          </Text>
          {item.overtime_reason && (
            <Text style={styles.expandedOvertimeApprovedReason}>{item.overtime_reason}</Text>
          )}
        </View>
      );
    }

    if (canRequestOvertime) {
      return (
        <TouchableOpacity
          style={styles.expandedAddOvertimeButton}
          onPress={onRequestOvertime}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="clock-plus-outline" size={16} color={Colors.purple} />
          <Text style={styles.expandedAddOvertimeText}>Request Overtime</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const rowContent = (
    <Animated.View
      entering={FadeInRight.delay(index * 50).springify()}
      layout={Layout.springify()}
      style={styles.rowContainer}
    >
      <TouchableOpacity
        style={[styles.tableRow, isExpanded && styles.tableRowExpanded]}
        onPress={() => hasExpandableContent && onToggleExpand()}
        activeOpacity={hasExpandableContent ? 0.7 : 1}
        accessibilityLabel={`${dateStr} ${weekday}, Check in ${item.check_in_time ? formatTime(new Date(item.check_in_time)) : 'not recorded'}, Check out ${item.check_out_time ? formatTime(new Date(item.check_out_time)) : 'not recorded'}${hasExpandableContent ? ', tap to expand details' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        {/* Date */}
        <View style={styles.tableCellDate}>
          <Text style={styles.tableCellDateText}>{dateStr}</Text>
          <Text style={styles.tableCellWeekday}>{weekday}</Text>
        </View>

        {/* Check-in */}
        <View style={styles.tableCellTime}>
          <Text style={styles.tableCellTimeText}>
            {item.check_in_time ? formatTime(new Date(item.check_in_time)) : '--:--'}
          </Text>
        </View>

        {/* Check-out */}
        <View style={styles.tableCellTime}>
          <Text style={styles.tableCellTimeText}>
            {item.check_out_time ? formatTime(new Date(item.check_out_time)) : '--:--'}
          </Text>
        </View>

        {/* Hours */}
        <View style={styles.tableCellHours}>
          <Text style={styles.tableCellHoursText}>
            {item.total_hours
              ? formatHours(item.total_hours - (item.overtime_hours || 0))
              : '--'}
          </Text>
        </View>

        {/* OT */}
        <View style={styles.tableCellOT}>
          {(item.overtime_hours || 0) > 0 ? (
            <Text style={styles.tableCellOTText}>{formatHours(item.overtime_hours || 0)}</Text>
          ) : overtimeRequest?.status === 'pending' ? (
            <View style={styles.otPendingDot} />
          ) : canRequestOvertime ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onRequestOvertime();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Add overtime for ${dateStr}`}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.purple} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.tableCellOTEmpty}>--</Text>
          )}
        </View>

        {/* Expand indicator */}
        {hasExpandableContent && (
          <View style={styles.expandIndicator}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.gray400}
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <Animated.View
          entering={FadeInLeft.duration(200)}
          style={styles.expandedContent}
        >
          {/* Notes Section */}
          {item.notes && (
            <View style={styles.expandedSection}>
              <View style={styles.expandedSectionHeader}>
                <Feather name="file-text" size={14} color={Colors.gray500} />
                <Text style={styles.expandedSectionLabel}>Notes</Text>
              </View>
              <Text style={styles.expandedNotesText}>{item.notes}</Text>
            </View>
          )}

          {/* Overtime Section */}
          {item.check_in_time && item.check_out_time && renderOvertimeStatus()}
        </Animated.View>
      )}
    </Animated.View>
  );

  // Only wrap in Swipeable if overtime can be requested
  if (canRequestOvertime) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        {rowContent}
      </Swipeable>
    );
  }

  return rowContent;
}

const styles = StyleSheet.create({
  rowContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.xl,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    minHeight: 56,
  },
  tableRowExpanded: {
    backgroundColor: Colors.backgroundSecondary,
  },
  tableCellDate: {
    width: 65,
    paddingRight: 4,
  },
  tableCellDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  tableCellWeekday: {
    fontSize: 9,
    color: Colors.gray400,
    marginTop: 1,
  },
  tableCellTime: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellTimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray700,
  },
  tableCellHours: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellHoursText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.indigo,
  },
  tableCellOT: {
    width: 40,
    alignItems: 'center',
  },
  tableCellOTText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.purple,
  },
  tableCellOTEmpty: {
    fontSize: 10,
    color: Colors.gray300,
  },
  otPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  expandIndicator: {
    width: 16,
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  expandedSection: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  expandedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  expandedSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedNotesText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  // Swipe action styles
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionButton: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  swipeActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textInverse,
    marginTop: 2,
  },
  // Overtime status styles
  expandedOvertimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  expandedOvertimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  expandedOvertimePending: {
    backgroundColor: StatusColors.pending.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  expandedOvertimePendingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: StatusColors.pending.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimePendingHours: {
    fontSize: 13,
    fontWeight: '600',
    color: StatusColors.pending.text,
  },
  expandedOvertimeReason: {
    fontSize: 12,
    color: Colors.warningDark,
    marginTop: 4,
  },
  expandedOvertimeRejected: {
    backgroundColor: StatusColors.rejected.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
  },
  expandedOvertimeRejectedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: StatusColors.rejected.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimeRejectedHours: {
    fontSize: 13,
    fontWeight: '600',
    color: StatusColors.rejected.text,
  },
  expandedOvertimeRejectedNote: {
    fontSize: 12,
    color: Colors.errorDark,
    marginTop: 4,
    fontStyle: 'italic',
  },
  expandedOvertimeApproved: {
    backgroundColor: Colors.purpleLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
  },
  expandedOvertimeApprovedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedOvertimeApprovedHours: {
    fontSize: 14,
    fontWeight: '700',
    color: StatusColors.overtime.text,
    marginTop: 2,
  },
  expandedOvertimeApprovedReason: {
    fontSize: 12,
    color: Colors.purple,
    marginTop: 4,
  },
  expandedAddOvertimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.purpleLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
  },
  expandedAddOvertimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purple,
  },
});
