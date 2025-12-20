import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAllOvertimeRequests } from '@/hooks/queries/useOvertimeRequests';
import { useAuth } from '@/hooks/auth/useAuth';
import { OvertimeRequestWithUser, OvertimeRequestStatus } from '@/lib/types';
import OvertimeApprovalModal from '@/components/attendance/OvertimeApprovalModal';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import { formatHours } from '@/lib/utils/attendance.utils';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function OvertimeRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequestWithUser | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OvertimeRequestStatus>('all');

  const {
    data: overtimeRequests,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAllOvertimeRequests(
    statusFilter === 'all'
      ? { organizationId: user?.organization_id || '' }
      : { status: statusFilter, organizationId: user?.organization_id || '' },
    {
      enabled: !!user?.organization_id,
    }
  );

  const pendingCount = overtimeRequests?.filter((req) => req.status === 'pending').length || 0;
  const approvedCount = overtimeRequests?.filter((req) => req.status === 'approved').length || 0;
  const rejectedCount = overtimeRequests?.filter((req) => req.status === 'rejected').length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.warning;
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      default:
        return Colors.textSecondary;
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
      default:
        return 'help-circle-outline';
    }
  };

  const renderOvertimeRequestCard = ({ item }: { item: OvertimeRequestWithUser }) => {
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => item.status === 'pending' ? setSelectedRequest(item) : null}
        activeOpacity={item.status === 'pending' ? 0.7 : 1}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.employeeAvatar}>
              <Ionicons name="person" size={18} color={Colors.primary} />
            </View>
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>
                {item.user?.full_name || 'Unknown Employee'}
              </Text>
              <Text style={styles.employeeId}>
                ID: {item.user?.employee_id || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            <Ionicons
              name={getStatusIcon(item.status) as any}
              size={12}
              color={getStatusColor(item.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.cardDetailsGrid}>
          <View style={styles.cardDetailRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.cardDetailLabel}>Date:</Text>
            <Text style={styles.cardDetailValue}>
              {formatDate(new Date(item.request_date))}
            </Text>
          </View>

          <View style={styles.cardDetailRow}>
            <MaterialCommunityIcons name="clock-plus-outline" size={14} color="#8B5CF6" />
            <Text style={styles.cardDetailLabel}>Requested:</Text>
            <Text style={[styles.cardDetailValue, { color: '#8B5CF6', fontWeight: '700' }]}>
              {formatHours(item.requested_hours)}
            </Text>
          </View>

          {item.status === 'approved' && item.approved_hours && (
            <View style={styles.cardDetailRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
              <Text style={styles.cardDetailLabel}>Approved:</Text>
              <Text style={[styles.cardDetailValue, { color: Colors.success, fontWeight: '700' }]}>
                {formatHours(item.approved_hours)}
              </Text>
            </View>
          )}

          {item.attendance_record && (
            <View style={styles.cardDetailRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.cardDetailLabel}>Work Hours:</Text>
              <Text style={styles.cardDetailValue}>
                {item.attendance_record.check_in_time
                  ? formatTime(new Date(item.attendance_record.check_in_time))
                  : '--:--'}{' '}
                -{' '}
                {item.attendance_record.check_out_time
                  ? formatTime(new Date(item.attendance_record.check_out_time))
                  : '--:--'}
              </Text>
            </View>
          )}
        </View>

        {/* Reason */}
        {item.reason && (
          <View style={styles.reasonSection}>
            <View style={styles.reasonHeader}>
              <Feather name="message-circle" size={12} color={Colors.textSecondary} />
              <Text style={styles.reasonLabel}>Reason</Text>
            </View>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}

        {/* Footer for pending requests */}
        {item.status === 'pending' && (
          <View style={styles.cardFooter}>
            <Ionicons name="hand-right-outline" size={14} color="#8B5CF6" />
            <Text style={[styles.cardFooterText, { color: '#8B5CF6' }]}>Tap to review</Text>
          </View>
        )}

        {/* Reviewer notes for approved/rejected */}
        {item.status !== 'pending' && item.reviewer_notes && (
          <View style={styles.reviewerSection}>
            <Text style={styles.reviewerLabel}>Reviewer Notes:</Text>
            <Text style={styles.reviewerNotes}>{item.reviewer_notes}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
        <Stack.Screen
          options={{
            title: 'Overtime Requests',
            headerShown: true,
          }}
        />
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading overtime requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
        <Stack.Screen
          options={{
            title: 'Overtime Requests',
            headerShown: true,
          }}
        />
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Failed to load overtime requests</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} translucent={false} />
      <Stack.Screen
        options={{
          title: 'Overtime Requests',
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerShadowVisible: false,
        }}
      />

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{overtimeRequests?.length || 0}</Text>
          <Text style={styles.statText}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.statText}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>{approvedCount}</Text>
          <Text style={styles.statText}>Approved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.error }]}>{rejectedCount}</Text>
          <Text style={styles.statText}>Rejected</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'all' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'all' && styles.filterChipBadgeTextActive]}>
                {overtimeRequests?.length || 0}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pending' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'pending' && styles.filterChipTextActive]}>
              Pending
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'pending' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'pending' && styles.filterChipBadgeTextActive]}>
                {pendingCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'approved' && styles.filterChipActive]}
            onPress={() => setStatusFilter('approved')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'approved' && styles.filterChipTextActive]}>
              Approved
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'approved' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'approved' && styles.filterChipBadgeTextActive]}>
                {approvedCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'rejected' && styles.filterChipActive]}
            onPress={() => setStatusFilter('rejected')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'rejected' && styles.filterChipTextActive]}>
              Rejected
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'rejected' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'rejected' && styles.filterChipBadgeTextActive]}>
                {rejectedCount}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* List */}
      {overtimeRequests && overtimeRequests.length > 0 ? (
        <FlatList
          data={overtimeRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderOvertimeRequestCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clock-plus-outline" size={64} color={Colors.gray300} />
          <Text style={styles.emptyTitle}>No overtime requests found</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'all'
              ? 'There are no overtime requests yet.'
              : statusFilter === 'pending'
              ? 'There are no pending overtime requests.'
              : `There are no ${statusFilter} overtime requests.`}
          </Text>
        </View>
      )}

      {/* Overtime Approval Modal */}
      {selectedRequest && (
        <OvertimeApprovalModal
          visible={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null);
            refetch();
          }}
          overtimeRequest={selectedRequest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing['md'],
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  retryButton: {
    marginTop: Spacing['lg'],
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['md'],
    backgroundColor: '#8B5CF6',
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['xl'],
    backgroundColor: Colors.background,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  filterTabsContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTabs: {
    paddingHorizontal: Spacing['lg'],
    paddingVertical: Spacing['md'],
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
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  filterChipBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing['sm'],
    paddingVertical: 2,
    borderRadius: BorderRadius.lg,
    minWidth: 24,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: '#A78BFA',
  },
  filterChipBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  filterChipBadgeTextActive: {
    color: Colors.textInverse,
  },
  listContent: {
    padding: Spacing['lg'],
    paddingBottom: 120,
  },
  requestCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    marginBottom: Spacing['md'],
    gap: Spacing['md'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing['sm'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['sm'],
    flex: 1,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  employeeId: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
    paddingHorizontal: Spacing['sm'],
    paddingVertical: Spacing['xs'],
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  cardDetailsGrid: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing['md'],
    gap: Spacing['sm'],
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  cardDetailLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginLeft: Spacing['xs'],
  },
  cardDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  reasonSection: {
    padding: Spacing['md'],
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    gap: Spacing['xs'],
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
    marginBottom: Spacing['xs'],
  },
  reasonLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['xs'],
    paddingTop: Spacing['md'],
    paddingBottom: Spacing['xs'],
  },
  cardFooterText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  reviewerSection: {
    padding: Spacing['md'],
    backgroundColor: '#FAF5FF',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  reviewerLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: '#8B5CF6',
    textTransform: 'uppercase',
    marginBottom: Spacing['xs'],
    letterSpacing: 0.5,
  },
  reviewerNotes: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['4xl'],
    gap: Spacing['md'],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
