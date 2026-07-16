import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, StatusBar, ScrollView, Platform, RefreshControl } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/hooks/auth/useAuth';
import { useLeaveRequests } from '@/hooks/queries/useLeave';
import { useCreateLeaveRequest } from '@/hooks/mutations/useLeaveMutations';
import { formatDate } from '@/lib/utils/date.utils';
import { LeaveRequest, LeaveType } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients, StatusColors, FontFamily } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

const LEAVE_TYPES: LeaveType[] = ['sick', 'casual', 'earned', 'unpaid', 'other'];

export default function LeaveScreen() {
  const { user } = useAuth();
  const { success, error } = useAlert();
  const userId = user?.id || '';

  const { apply } = useLocalSearchParams<{ apply?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Auto-open the apply form when navigated here with ?apply=1
  // (e.g. from the "Apply for Leave" shortcut on the notifications page).
  useEffect(() => {
    if (apply) setModalVisible(true);
  }, [apply]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'casual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const { data: leaveRequests, isLoading, refetch } = useLeaveRequests(userId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };
  const createLeaveMutation = useCreateLeaveRequest(userId, user?.organization_id, {
    onSuccess: () => {
      success('Success', 'Leave request submitted successfully');
      setModalVisible(false);
      setFormData({
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
      });
      setStartDate(new Date());
      setEndDate(new Date());
    },
    onError: (err) => {
      error('Error', err.message);
    },
  });

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, startDate: formattedDate });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, endDate: formattedDate });
    }
  };

  const handleSubmit = () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      error('Error', 'Please fill in all fields');
      return;
    }

    createLeaveMutation.mutate({
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
    });
  };

  const renderLeaveItem = ({ item }: { item: LeaveRequest }) => {
    const statusConfig = {
      pending: { bg: StatusColors.pending.background, color: Colors.warning, icon: 'clock-outline' },
      approved: { bg: StatusColors.approved.background, color: Colors.success, icon: 'check-circle' },
      rejected: { bg: StatusColors.rejected.background, color: Colors.error, icon: 'close-circle' },
    };
    const leaveTypeConfig = {
      sick: { bg: StatusColors.rejected.background, color: Colors.error, icon: 'medical-bag' },
      casual: { bg: '#DBEAFE', color: Colors.info, icon: 'coffee' },
      earned: { bg: StatusColors.approved.background, color: Colors.success, icon: 'star' },
      unpaid: { bg: Colors.purpleLight, color: Colors.purple, icon: 'cash-off' },
      other: { bg: Colors.gray100, color: Colors.gray500, icon: 'dots-horizontal' },
    };
    const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
    const typeConfig = leaveTypeConfig[item.leave_type as keyof typeof leaveTypeConfig] || leaveTypeConfig.other;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.leaveIconWrapper, { backgroundColor: typeConfig.bg }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={24} color={typeConfig.color} />
            </View>
            <View>
              <Text style={styles.leaveTypeTitle}>{item.leave_type}</Text>
              <Text style={styles.cardSubtext}>{item.total_days} day{item.total_days > 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.dateRangeContainer}>
          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Ionicons name="calendar-outline" size={18} color={Colors.gray500} />
              <Text style={styles.dateLabel}>From</Text>
            </View>
            <Text style={styles.dateValue}>{formatDate(new Date(item.start_date))}</Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Ionicons name="calendar" size={18} color={Colors.gray500} />
              <Text style={styles.dateLabel}>To</Text>
            </View>
            <Text style={styles.dateValue}>{formatDate(new Date(item.end_date))}</Text>
          </View>
        </View>

        <View style={styles.reasonContainer}>
          <View style={styles.reasonHeader}>
            <Feather name="message-square" size={16} color={Colors.gray500} />
            <Text style={styles.reasonLabel}>Reason</Text>
          </View>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>

        {item.reviewer_notes && (
          <View style={styles.reviewerNotesContainer}>
            <View style={styles.reviewerNotesHeader}>
              <MaterialCommunityIcons name="comment-text-outline" size={16} color={Colors.indigo} />
              <Text style={styles.reviewerNotesLabel}>Reviewer Notes</Text>
            </View>
            <Text style={styles.reviewerNotesText}>{item.reviewer_notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <LinearGradient
          colors={Gradients.saffronHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>Leave Requests</Text>
              <View style={styles.heroDatePill}>
                <MaterialCommunityIcons name="beach" size={16} color={Colors.textInverse} />
                <Text style={styles.heroDateText}>
                  {leaveRequests?.filter(r => r.status === 'pending').length || 0} pending
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Apply for leave"
            accessibilityRole="button"
            accessibilityHint="Opens form to apply for leave"
          >
            <Ionicons name="add-circle" size={20} color={Colors.primary} />
            <Text style={styles.addButtonText}>Apply for Leave</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.contentWrapper}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : leaveRequests && leaveRequests.length > 0 ? (
            leaveRequests.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(100 + index * 80).springify()}>
                {renderLeaveItem({ item })}
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="beach" size={64} color={Colors.gray300} />
              <Text style={styles.emptyText}>No leave requests yet</Text>
              <Text style={styles.emptySubtext}>Apply for leave using the button above</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                accessibilityLabel="Close leave application form"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

            <View style={styles.formSection}>
              <Text style={styles.label}>Leave Type</Text>
              <View style={styles.typeSelector}>
                {LEAVE_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.leaveType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, leaveType: type })}
                    activeOpacity={0.7}
                    accessibilityLabel={`${type} leave`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: formData.leaveType === type }}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.leaveType === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
                activeOpacity={0.7}
                accessibilityLabel={`Start date: ${formData.startDate ? formatDate(new Date(formData.startDate)) : 'not selected'}`}
                accessibilityRole="button"
                accessibilityHint="Tap to select start date"
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.gray500} style={styles.inputIcon} />
                <Text style={[styles.datePickerText, formData.startDate && styles.datePickerTextSelected]}>
                  {formData.startDate ? formatDate(new Date(formData.startDate)) : 'Select start date'}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.7}
                accessibilityLabel={`End date: ${formData.endDate ? formatDate(new Date(formData.endDate)) : 'not selected'}`}
                accessibilityRole="button"
                accessibilityHint="Tap to select end date"
              >
                <Ionicons name="calendar" size={20} color={Colors.gray500} style={styles.inputIcon} />
                <Text style={[styles.datePickerText, formData.endDate && styles.datePickerTextSelected]}>
                  {formData.endDate ? formatDate(new Date(formData.endDate)) : 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                  minimumDate={formData.startDate ? new Date(formData.startDate) : new Date()}
                />
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter reason for leave"
                placeholderTextColor={Colors.textTertiary}
                value={formData.reason}
                onChangeText={text => setFormData({ ...formData, reason: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Reason for leave"
                accessibilityHint="Enter the reason for your leave request"
              />
            </View>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={createLeaveMutation.isPending}
                activeOpacity={0.7}
                accessibilityLabel={createLeaveMutation.isPending ? "Submitting request" : "Submit leave request"}
                accessibilityRole="button"
                accessibilityState={{ disabled: createLeaveMutation.isPending }}
              >
                {createLeaveMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.textInverse} />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 120,
    gap: Spacing['lg'],
  },
  contentWrapper: {
    gap: Spacing['lg'],
  },
  heroSection: {
    marginHorizontal: -Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['6xl'],
    paddingBottom: Spacing['xl'],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
    gap: Spacing['lg'],
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextBlock: {
    flex: 1,
    gap: Spacing['md'],
  },
  heroGreeting: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing['xs'],
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing['md'],
    paddingVertical: Spacing['xs'],
    borderRadius: BorderRadius.full,
  },
  heroDateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  addButton: {
    backgroundColor: Colors.backgroundSecondary,
    flexDirection: 'row',
    paddingVertical: Spacing['lg'],
    paddingHorizontal: Spacing['xl'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['sm'],
    ...Shadows.md,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  card: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    marginBottom: Spacing['lg'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leaveIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveTypeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  cardSubtext: {
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateRangeContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    fontWeight: Typography.fontWeight.semibold,
  },
  dateValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  dateDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  reasonContainer: {
    marginBottom: 8,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 13,
    color: Colors.gray500,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  reviewerNotesContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.indigoLight,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.indigo,
  },
  reviewerNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reviewerNotesLabel: {
    fontSize: 13,
    color: Colors.indigo,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewerNotesText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.gray500,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    padding: Spacing["2xl"],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing["2xl"],
  },
  modalTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeButtonActive: {
    backgroundColor: Colors.indigo,
    borderColor: Colors.indigo,
  },
  typeButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray500,
    textTransform: 'capitalize',
    fontWeight: Typography.fontWeight.semibold,
  },
  typeButtonTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.bold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: Typography.fontSize.base,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text,
    height: 100,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  datePickerText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
  },
  datePickerTextSelected: {
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    backgroundColor: Colors.gray100,
  },
  cancelButtonText: {
    color: Colors.gray600,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: Colors.indigo,
    ...Platform.select({
      ios: {
        shadowColor: Colors.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
