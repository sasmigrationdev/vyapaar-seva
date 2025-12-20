import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCurrentEmployment } from '@/hooks/queries/useEmploymentHistory';
import { useLeaveOrganization } from '@/hooks/mutations/useEmployerMutations';
import { formatDate } from '@/lib/utils/date.utils';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

export default function ChangeEmployerFlowScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const userId = user?.id || '';

  // Get current employment details
  const { data: currentEmployment, isLoading: loadingEmployment } = useCurrentEmployment(userId);

  // Leave organization mutation
  const leaveMutation = useLeaveOrganization(userId, currentEmployment?.organization_id, {
    onSuccess: () => {
      success(
        'Left Employer',
        'You have successfully left your current employer. You can now search for a new employer.',
        () => router.replace('/(employee)/search-employer')
      );
    },
    onError: (err: any) => {
      error('Error', err?.message || 'Failed to leave employer');
    },
  });

  const handleLeaveOrganization = () => {
    confirmDestructive(
      'Confirm Leave',
      'Are you sure you want to leave your current employer? This action cannot be undone.',
      () => {
        leaveMutation.mutate({});
      },
      undefined,
      'Leave'
    );
  };

  if (loadingEmployment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Change Employer',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading employment details...</Text>
        </View>
      </View>
    );
  }

  if (!currentEmployment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Change Employer',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name="briefcase-off" size={64} color={Colors.gray400} />
          </View>
          <Text style={styles.emptyTitle}>No Current Employment</Text>
          <Text style={styles.emptyText}>
            You are not currently employed with any employer.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(employee)/search-employer')}
            activeOpacity={0.7}
          >
            <Feather name="search" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Search for Employer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Change Employer',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: Colors.background,
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warningIconWrapper}>
            <Ionicons name="warning" size={22} color="#DC2626" />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Important Notice</Text>
            <Text style={styles.warningText}>
              Leaving your current employer will end your employment and clear all associated data.
              This action cannot be undone.
            </Text>
          </View>
        </View>

        {/* Current Employer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Employer</Text>

          <View style={styles.employerCard}>
            {/* Header */}
            <View style={styles.employerHeader}>
              <View style={styles.employerIconContainer}>
                <MaterialCommunityIcons name="account-tie" size={32} color={Colors.primary} />
              </View>
              <View style={styles.employerInfo}>
                <Text style={styles.employerName}>
                  {currentEmployment.employer_name ||
                   currentEmployment.organization?.owner?.full_name ||
                   currentEmployment.organization?.name ||
                   'Unknown Employer'}
                </Text>
                <View style={styles.dateRow}>
                  <Feather name="calendar" size={14} color={Colors.textSecondary} />
                  <Text style={styles.employerMeta}>
                    Joined {currentEmployment.joined_at ? formatDate(new Date(currentEmployment.joined_at)) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Details */}
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                </View>
                <Text style={styles.detailLabel}>Join Method</Text>
                <Text style={styles.detailValue}>
                  {currentEmployment.join_method === 'request'
                    ? 'Join Request'
                    : currentEmployment.join_method === 'hr_created'
                    ? 'HR Created'
                    : 'Migrated'}
                </Text>
              </View>

              {currentEmployment.approver && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconWrapper}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.detailLabel}>Approved By</Text>
                  <Text style={styles.detailValue}>{currentEmployment.approver.full_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={leaveMutation.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dangerButton,
              leaveMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleLeaveOrganization}
            disabled={leaveMutation.isPending}
            activeOpacity={0.7}
          >
            {leaveMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="briefcase-remove" size={18} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>Leave Employer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing["2xl"],
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  warningTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: '#DC2626',
  },
  warningText: {
    fontSize: Typography.fontSize.sm,
    color: '#991B1B',
    lineHeight: 20,
  },
  // Section
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  // Employer Card
  employerCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  employerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  employerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employerInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  employerName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  employerMeta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  detailsList: {
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dangerButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
