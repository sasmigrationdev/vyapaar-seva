import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  StatusBar,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAlert } from '@/hooks/useAlert';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAllJoinRequests } from '@/hooks/queries/useEmployerRequests';
import {
  useApproveJoinRequest,
  useRejectJoinRequest,
} from '@/hooks/mutations/useEmployerMutations';
import { EmployerEmployeeRequest } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function JoinRequestsScreen() {
  const { user } = useAuth();
  const { success, error } = useAlert();
  const userId = user?.id || '';
  const organizationId = user?.organization_id || '';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedRequest, setSelectedRequest] = useState<EmployerEmployeeRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Use a single hook to avoid conditional hook calls (violates Rules of Hooks)
  // This approach always calls the same hook and uses filters parameter
  // useMemo stabilizes the filter object to prevent React Compiler cache size issues
  const statusFilterParam = useMemo(
    () => (statusFilter === 'all' ? undefined : { status: statusFilter }),
    [statusFilter]
  );

  const {
    data: requests,
    isLoading,
    error: fetchError,
    refetch,
    isRefetching,
  } = useAllJoinRequests(organizationId, statusFilterParam);

  // Mutations
  const approveMutation = useApproveJoinRequest({
    onSuccess: () => {
      success('Success', 'Join request approved successfully!');
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      refetch();
    },
    onError: (err: any) => {
      error('Error', err?.message || 'Failed to approve request');
    },
  });

  const rejectMutation = useRejectJoinRequest({
    onSuccess: () => {
      success('Success', 'Join request rejected');
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      refetch();
    },
    onError: (err: any) => {
      error('Error', err?.message || 'Failed to reject request');
    },
  });

  // Handle review
  const handleReview = (request: EmployerEmployeeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const confirmReview = () => {
    if (!selectedRequest || !reviewAction) return;

    if (reviewAction === 'approve') {
      approveMutation.mutate({
        requestId: selectedRequest.id,
        reviewerId: userId,
        notes: reviewNotes || undefined,
      });
    } else {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        reviewerId: userId,
        notes: reviewNotes || undefined,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'cancelled':
        return '#64748B';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderFilterButton = (filter: StatusFilter, label: string, count?: number) => {
    const isActive = statusFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setStatusFilter(filter)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderRequestCard = ({
    item,
  }: {
    item: EmployerEmployeeRequest & {
      employee?: { full_name: string; email: string; phone?: string };
      reviewed_by_user?: { full_name: string };
    };
  }) => {
    const isPending = item.status === 'pending';
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.requestCard}>
        {/* Header with Avatar and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.employeeAvatar}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.primary} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.employeeName}>
              {item.employee?.full_name || 'Unknown Employee'}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.employee?.email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Request Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatDate(new Date(item.created_at))} • {formatTime(new Date(item.created_at))}
            </Text>
          </View>

          {item.employee?.phone && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{item.employee.phone}</Text>
            </View>
          )}

          {item.message && (
            <View style={styles.messageBox}>
              <MaterialCommunityIcons name="message-text-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.messageText} numberOfLines={2}>
                {item.message}
              </Text>
            </View>
          )}
        </View>

        {/* Review Info for non-pending */}
        {!isPending && item.reviewed_by_user && (
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewText}>
              {item.status === 'approved' ? '✓ Approved' : '✗ Rejected'} by {item.reviewed_by_user.full_name}
            </Text>
            {item.reviewer_notes && (
              <Text style={styles.reviewNotes} numberOfLines={1}>
                {item.reviewer_notes}
              </Text>
            )}
          </View>
        )}

        {/* Actions for pending */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReview(item, 'reject')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color={Colors.error} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleReview(item, 'approve')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color={Colors.textInverse} />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons
            name={statusFilter === 'pending' ? 'account-clock' : 'inbox'}
            size={48}
            color={Colors.gray300}
          />
        </View>
        <Text style={styles.emptyStateTitle}>
          {statusFilter === 'pending' ? 'No Pending Requests' : 'No Requests'}
        </Text>
        <Text style={styles.emptyStateText}>
          {statusFilter === 'pending'
            ? 'New join requests will appear here'
            : `No ${statusFilter} requests found`}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={styles.heroSection}
        >
          <Text style={styles.heroTitle}>Join Requests</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={styles.heroSection}
        >
          <Text style={styles.heroTitle}>Join Requests</Text>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>
            {fetchError?.message || 'Failed to load join requests'}
          </Text>
        </View>
      </View>
    );
  }

  const pendingCount = requests?.filter((r: EmployerEmployeeRequest) => r.status === 'pending').length || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Join Requests',
          headerStyle: {
            backgroundColor: Colors.backgroundSecondary,
          },
          headerTitleStyle: {
            fontSize: Typography.fontSize.xl,
            fontWeight: Typography.fontWeight.bold,
            color: Colors.text,
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {/* Filter Chips */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContent}
          >
            {renderFilterButton('pending', 'Pending', pendingCount)}
            {renderFilterButton('approved', 'Approved')}
            {renderFilterButton('rejected', 'Rejected')}
            {renderFilterButton('all', 'All')}
          </ScrollView>
        </Animated.View>

        {/* Requests List */}
        <View style={styles.requestsContainer}>
          {(requests as any)?.length > 0 ? (
            (requests as any).map((item: any, index: number) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(100 + index * 80).springify()}>
                {renderRequestCard({ item })}
              </Animated.View>
            ))
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reviewAction === 'approve' ? 'Approve Request' : 'Reject Request'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={styles.modalBody}>
                <View style={styles.modalEmployeeCard}>
                  <View style={styles.modalAvatar}>
                    <MaterialCommunityIcons name="account" size={24} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.modalEmployeeName}>
                      {selectedRequest.employee?.full_name || 'Unknown'}
                    </Text>
                    <Text style={styles.modalEmployeeEmail}>
                      {selectedRequest.employee?.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalInputLabel}>
                    {reviewAction === 'approve' ? 'Welcome message (optional)' : 'Reason (optional)'}
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={
                      reviewAction === 'approve'
                        ? 'Add a welcome message...'
                        : 'Add a reason...'
                    }
                    placeholderTextColor={Colors.gray400}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowReviewModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  reviewAction === 'approve' ? styles.modalApproveButton : styles.modalRejectButton,
                ]}
                onPress={confirmReview}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                activeOpacity={0.7}
              >
                {approveMutation.isPending || rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
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
  filtersContainer: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChipsContent: {
    gap: Spacing['sm'],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['sm'],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 36,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.2,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  filterBadge: {
    backgroundColor: Colors.border,
    minWidth: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing['sm'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: Colors.primaryLight,
  },
  filterBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.xs * 1.3,
  },
  filterBadgeTextActive: {
    color: Colors.textInverse,
  },
  requestsContainer: {
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['md'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing['md'],
    paddingVertical: Spacing['4xl'],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing['md'],
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    marginBottom: Spacing['md'],
    gap: Spacing['md'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['md'],
  },
  employeeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeaderContent: {
    flex: 1,
    gap: Spacing['xs'],
  },
  employeeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  metaText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsSection: {
    gap: Spacing['sm'],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
  },
  detailText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['sm'],
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.lg,
    padding: Spacing['lg'],
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  messageText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontStyle: 'italic',
  },
  reviewInfo: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing['md'],
    gap: Spacing['xs'],
  },
  reviewText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  reviewNotes: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing['sm'],
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.error,
    gap: Spacing['sm'],
  },
  rejectButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    gap: Spacing['sm'],
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  approveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing['md'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing['xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['xl'],
  },
  modalTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: Spacing['xs'],
  },
  modalBody: {
    gap: Spacing['lg'],
    marginBottom: Spacing['xl'],
  },
  modalEmployeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['md'],
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing['md'],
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmployeeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  modalEmployeeEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalInputContainer: {
    gap: Spacing['sm'],
  },
  modalInputLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing['md'],
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    minHeight: 80,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['md'],
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
  },
  modalCancelText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApproveButton: {
    backgroundColor: Colors.success,
  },
  modalRejectButton: {
    backgroundColor: Colors.error,
  },
  modalConfirmText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
});
