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
import { useAllBreakRequests } from '@/hooks/queries/useBreakRequests';
import { useAuth } from '@/hooks/auth/useAuth';
import { BreakRequest } from '@/lib/types';
import BreakApprovalModal from '@/components/attendance/BreakApprovalModal';
import { formatDate, formatTime } from '@/lib/utils/date.utils';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAutoRejectExpiredBreaksForOrg } from '@/hooks/useAutoRejectExpiredBreaksForOrg';

export default function BreakRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<BreakRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_start' | 'active' | 'completed' | 'rejected'>('all');

  const {
    data: breakRequests,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAllBreakRequests(
    statusFilter === 'all'
      ? { organizationId: user?.organization_id || '' }
      : { status: statusFilter, organizationId: user?.organization_id || '' },
    {
      enabled: !!user?.organization_id,
    }
  );

  // Auto-reject expired pending break requests
  useAutoRejectExpiredBreaksForOrg(
    user?.organization_id || '',
    user?.id || ''
  );

  const pendingStartCount = breakRequests?.filter((req) => req.status === 'pending_start').length || 0;
  const activeCount = breakRequests?.filter((req) => req.status === 'active').length || 0;
  const completedCount = breakRequests?.filter((req) => req.status === 'completed').length || 0;
  const rejectedCount = breakRequests?.filter((req) => req.status === 'rejected').length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_start':
        return Colors.warning;
      case 'active':
        return '#3B82F6'; // Blue for active
      case 'completed':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      case 'cancelled':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_start':
        return 'clock-outline';
      case 'active':
        return 'play-circle';
      case 'completed':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle-outline';
    }
  };

  const renderBreakRequestCard = ({ item }: { item: BreakRequest & {
    user?: { full_name: string; employee_id: string };
    attendance_record?: {
      date: string;
      check_in_time: string;
      check_out_time: string | null;
    };
  } }) => {

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => item.status === 'pending_start' ? setSelectedRequest(item) : null}
        activeOpacity={item.status === 'pending_start' ? 0.7 : 1}
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
              {item.status === 'pending_start' ? 'Pending' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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

          {item.requested_start_time && (
            <View style={styles.cardDetailRow}>
              <MaterialCommunityIcons name="coffee" size={14} color={Colors.textSecondary} />
              <Text style={styles.cardDetailLabel}>Start Time:</Text>
              <Text style={styles.cardDetailValue}>
                {formatTime(new Date(item.requested_start_time))}
              </Text>
            </View>
          )}
          
          {item.status === 'pending_start' && (
            <View style={styles.cardDetailRow}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
              <Text style={[styles.cardDetailLabel, { flex: 1, color: Colors.primary }]}>
                End time will be recorded with WiFi verification
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
        {item.status === 'pending_start' && (
          <View style={styles.cardFooter}>
            <Ionicons name="hand-right-outline" size={14} color={Colors.primary} />
            <Text style={styles.cardFooterText}>Tap to review</Text>
          </View>
        )}

        {/* Reviewer notes for approved/rejected */}
        {item.status !== 'pending_start' && item.reviewer_notes && (
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
            title: 'Break Requests',
            headerShown: true,
          }}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading break requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
        <Stack.Screen
          options={{
            title: 'Break Requests',
            headerShown: true,
          }}
        />
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Failed to load break requests</Text>
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
          title: 'Break Requests',
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
          <Text style={styles.statNumber}>{breakRequests?.length || 0}</Text>
          <Text style={styles.statText}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pendingStartCount}</Text>
          <Text style={styles.statText}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statText}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statText}>Completed</Text>
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
                {breakRequests?.length || 0}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pending_start' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pending_start')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'pending_start' && styles.filterChipTextActive]}>
              Pending
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'pending_start' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'pending_start' && styles.filterChipBadgeTextActive]}>
                {pendingStartCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
            onPress={() => setStatusFilter('active')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'active' && styles.filterChipTextActive]}>
              Active
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'active' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'active' && styles.filterChipBadgeTextActive]}>
                {activeCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'completed' && styles.filterChipActive]}
            onPress={() => setStatusFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'completed' && styles.filterChipTextActive]}>
              Completed
            </Text>
            <View style={[styles.filterChipBadge, statusFilter === 'completed' && styles.filterChipBadgeActive]}>
              <Text style={[styles.filterChipBadgeText, statusFilter === 'completed' && styles.filterChipBadgeTextActive]}>
                {completedCount}
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
      {breakRequests && breakRequests.length > 0 ? (
        <FlatList
          data={breakRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderBreakRequestCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="coffee-off-outline" size={64} color={Colors.gray300} />
          <Text style={styles.emptyTitle}>No break requests found</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'all'
              ? 'There are no break requests yet.'
              : statusFilter === 'pending_start'
              ? 'There are no pending break requests.'
              : `There are no ${statusFilter} break requests.`}
          </Text>
        </View>
      )}

      {/* Break Approval Modal */}
      {selectedRequest && (
        <BreakApprovalModal
          visible={!!selectedRequest}
          onClose={() => {
            setSelectedRequest(null);
            refetch();
          }}
          breakRequest={selectedRequest}
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight + '30',
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
    backgroundColor: Colors.primaryLight + '15',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  reviewerLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
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
