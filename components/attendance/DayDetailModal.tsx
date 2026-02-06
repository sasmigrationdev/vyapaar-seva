import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, StatusColors } from '@/constants/theme';
import { AttendanceRecord, OvertimeRequest } from '@/lib/types';
import { formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = 380;

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

interface DayDetailModalProps {
  visible: boolean;
  onClose: () => void;
  day: CalendarDay | null;
  overtimeRequest?: OvertimeRequest | null;
  onRequestOvertime?: (record: AttendanceRecord) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DayDetailModal({
  visible,
  onClose,
  day,
  overtimeRequest,
  onRequestOvertime,
}: DayDetailModalProps) {
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        translateY.value = withTiming(MODAL_HEIGHT, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  React.useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, translateY]);

  if (!day || !day.isCurrentMonth) return null;

  const getStatusBadge = () => {
    switch (day.status) {
      case 'present':
        return { color: StatusColors.present.icon, bg: StatusColors.present.background, text: 'Present' };
      case 'incomplete':
        return { color: StatusColors.pending.icon, bg: StatusColors.pending.background, text: 'Incomplete' };
      case 'absent':
        return { color: StatusColors.absent.icon, bg: StatusColors.absent.background, text: 'Absent' };
      case 'leave':
        return { color: Colors.accent, bg: Colors.accentLight + '20', text: 'On Leave' };
      case 'weekend':
        return { color: Colors.gray500, bg: Colors.gray100, text: 'Weekend' };
      default:
        return { color: Colors.gray400, bg: Colors.gray100, text: '--' };
    }
  };

  const status = getStatusBadge();
  const record = day.record;

  const handleRequestOvertime = () => {
    if (record && onRequestOvertime) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClose();
      onRequestOvertime(record);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <AnimatedPressable
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
        onPress={onClose}
      />

      {/* Bottom Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.modalContainer, modalStyle]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.dateTitle}>
                {day.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {day.isToday && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Today</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>

          {/* Time Details */}
          {record && (
            <View style={styles.timeSection}>
              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <View style={styles.timeIconWrapper}>
                    <Ionicons name="log-in-outline" size={18} color={Colors.success} />
                  </View>
                  <View>
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>
                      {record.check_in_time
                        ? formatTime(new Date(record.check_in_time))
                        : '--:--'}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeDivider} />

                <View style={styles.timeBlock}>
                  <View style={styles.timeIconWrapper}>
                    <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                  </View>
                  <View>
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>
                      {record.check_out_time
                        ? formatTime(new Date(record.check_out_time))
                        : '--:--'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hours Summary */}
              <View style={styles.hoursSummary}>
                <View style={styles.hoursBlock}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={Colors.info} />
                  <View>
                    <Text style={styles.hoursLabel}>Working Hours</Text>
                    <Text style={styles.hoursValue}>
                      {record.total_hours
                        ? formatHours(record.total_hours - (record.overtime_hours || 0))
                        : '--'}
                    </Text>
                  </View>
                </View>

                {(record.overtime_hours || 0) > 0 && (
                  <View style={styles.hoursBlock}>
                    <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.purple} />
                    <View>
                      <Text style={styles.hoursLabel}>Overtime</Text>
                      <Text style={[styles.hoursValue, { color: Colors.purple }]}>
                        {formatHours(record.overtime_hours || 0)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Notes */}
              {record.notes && (
                <View style={styles.notesSection}>
                  <Feather name="file-text" size={14} color={Colors.textSecondary} />
                  <Text style={styles.notesText}>{record.notes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Overtime Request Status */}
          {overtimeRequest && (
            <View style={[
              styles.overtimeStatus,
              overtimeRequest.status === 'pending' && { backgroundColor: StatusColors.pending.background, borderColor: StatusColors.pending.border },
              overtimeRequest.status === 'approved' && { backgroundColor: StatusColors.approved.background, borderColor: StatusColors.approved.border },
              overtimeRequest.status === 'rejected' && { backgroundColor: StatusColors.rejected.background, borderColor: StatusColors.rejected.border },
            ]}>
              <Text style={[
                styles.overtimeStatusText,
                overtimeRequest.status === 'pending' && { color: StatusColors.pending.text },
                overtimeRequest.status === 'approved' && { color: StatusColors.approved.text },
                overtimeRequest.status === 'rejected' && { color: StatusColors.rejected.text },
              ]}>
                {overtimeRequest.status === 'pending' && `OT Request Pending: ${formatHours(overtimeRequest.requested_hours)}`}
                {overtimeRequest.status === 'approved' && `OT Approved: ${formatHours(overtimeRequest.approved_hours || 0)}`}
                {overtimeRequest.status === 'rejected' && `OT Request Rejected`}
              </Text>
            </View>
          )}

          {/* Request Overtime Action */}
          {record &&
            record.check_in_time &&
            record.check_out_time &&
            !overtimeRequest &&
            (record.overtime_hours || 0) === 0 &&
            onRequestOvertime && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRequestOvertime}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color={Colors.textInverse} />
                <Text style={styles.actionButtonText}>Request Overtime</Text>
              </TouchableOpacity>
            )}

          {/* Empty State for No Record */}
          {!record && day.status !== 'weekend' && day.status !== 'leave' && day.status !== 'future' && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={Colors.gray300} />
              <Text style={styles.emptyStateText}>No attendance recorded</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    minHeight: MODAL_HEIGHT,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dateTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  todayBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeSection: {
    gap: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  timeBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  hoursSummary: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  hoursBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  hoursLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  hoursValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  overtimeStatus: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  overtimeStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
