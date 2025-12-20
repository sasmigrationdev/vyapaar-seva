import { useState } from 'react';
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
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/constants/theme';

const LEAVE_TYPES: LeaveType[] = ['sick', 'casual', 'earned', 'unpaid', 'other'];

export default function LeaveScreen() {
  const { user } = useAuth();
  const { success, error } = useAlert();
  const userId = user?.id || '';

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
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
      pending: { bg: '#FEF3C7', color: '#F59E0B', icon: 'clock-outline' },
      approved: { bg: '#DCFCE7', color: '#10B981', icon: 'check-circle' },
      rejected: { bg: '#FEE2E2', color: '#EF4444', icon: 'close-circle' },
    };
    const leaveTypeConfig = {
      sick: { bg: '#FEE2E2', color: '#EF4444', icon: 'medical-bag' },
      casual: { bg: '#DBEAFE', color: '#3B82F6', icon: 'coffee' },
      earned: { bg: '#DCFCE7', color: '#10B981', icon: 'star' },
      unpaid: { bg: '#F3E8FF', color: '#A855F7', icon: 'cash-off' },
      other: { bg: '#F1F5F9', color: '#64748B', icon: 'dots-horizontal' },
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
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
              <Text style={styles.dateLabel}>From</Text>
            </View>
            <Text style={styles.dateValue}>{formatDate(new Date(item.start_date))}</Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateRow}>
            <View style={styles.dateRowLeft}>
              <Ionicons name="calendar" size={18} color="#64748B" />
              <Text style={styles.dateLabel}>To</Text>
            </View>
            <Text style={styles.dateValue}>{formatDate(new Date(item.end_date))}</Text>
          </View>
        </View>

        <View style={styles.reasonContainer}>
          <View style={styles.reasonHeader}>
            <Feather name="message-square" size={16} color="#64748B" />
            <Text style={styles.reasonLabel}>Reason</Text>
          </View>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>

        {item.reviewer_notes && (
          <View style={styles.reviewerNotesContainer}>
            <View style={styles.reviewerNotesHeader}>
              <MaterialCommunityIcons name="comment-text-outline" size={16} color="#6366F1" />
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
            leaveRequests.map((item) => (
              <View key={item.id}>
                {renderLeaveItem({ item })}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="beach" size={64} color="#CBD5E1" />
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
              >
                <Ionicons name="close" size={24} color="#64748B" />
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
              >
                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
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
              >
                <Ionicons name="calendar" size={20} color="#64748B" style={styles.inputIcon} />
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
                placeholderTextColor="#94A3B8"
                value={formData.reason}
                onChangeText={text => setFormData({ ...formData, reason: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={createLeaveMutation.isPending}
                activeOpacity={0.7}
              >
                {createLeaveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
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
    marginBottom: 16,
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
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
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
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  reviewerNotesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  reviewerNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reviewerNotesLabel: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewerNotesText: {
    fontSize: 14,
    color: '#334155',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0F172A',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    height: 100,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
  },
  datePickerTextSelected: {
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
