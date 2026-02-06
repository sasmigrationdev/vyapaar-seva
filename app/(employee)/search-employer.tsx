import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  useSearchEmployers,
  useHasPendingRequest,
  useIsCurrentlyEmployed,
} from '@/hooks/queries/useEmployerRequests';
import { useRequestJoinOrganization } from '@/hooks/mutations/useEmployerMutations';
import { EmployerSearchResult } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

export default function SearchEmployerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, confirm } = useAlert();
  const userId = user?.id || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Check if already employed
  const { data: isEmployed, isLoading: checkingEmployment } = useIsCurrentlyEmployed(userId);

  // Search employers (excluding organizations with pending requests)
  const {
    data: searchResults,
    isLoading: searching,
    error: searchError,
    refetch,
    isRefetching,
  } = useSearchEmployers(debouncedQuery, 20, userId);

  // Join request mutation
  const requestJoinMutation = useRequestJoinOrganization(userId, {
    onSuccess: () => {
      success(
        'Request Sent!',
        'Your join request has been sent to the employer. They will review it and respond soon.'
      );
      // No need to refetch search results - the mutation handles cache updates
    },
    onError: (err: any) => {
      error('Error', err?.message || 'Failed to send join request');
    },
  });

  // Handle search input with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setDebouncedQuery(text);
    }, 500);

    setSearchTimeout(timeout);
  };

  // Handle join request
  const handleJoinRequest = (employer: EmployerSearchResult) => {
    confirm(
      'Send Join Request?',
      `Do you want to send a join request to ${employer.organization_name}?`,
      () => {
        requestJoinMutation.mutate({
          organizationId: employer.organization_id,
        });
      },
      undefined,
      'Send Request'
    );
  };

  const renderEmployerCard = ({ item }: { item: EmployerSearchResult }) => {
    return <EmployerCard employer={item} onPress={handleJoinRequest} userId={userId} />;
  };

  const renderEmptyState = () => {
    if (searchQuery.length < 2) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Feather name="search" size={48} color={Colors.gray400} />
          </View>
          <Text style={styles.emptyStateTitle}>Search for Your Employer</Text>
          <Text style={styles.emptyStateText}>
            Enter employer code, organization name, or employer's name/email to find them
          </Text>
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Search Tips</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Use employer code (e.g., EMP000001)</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Search by organization name</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Try employer's name or email</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (searching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyStateText}>Searching...</Text>
        </View>
      );
    }

    if (searchError) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          </View>
          <Text style={styles.emptyStateTitle}>Search Failed</Text>
          <Text style={styles.emptyStateText}>
            {(searchError as any)?.message || 'Failed to search employers'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="business-outline" size={48} color={Colors.gray400} />
        </View>
        <Text style={styles.emptyStateTitle}>No Results Found</Text>
        <Text style={styles.emptyStateText}>
          No employers match "{searchQuery}". Try a different search term.
        </Text>
      </View>
    );
  };

  if (checkingEmployment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Search Employer',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (isEmployed) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Search Employer',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />
        <View style={styles.alreadyEmployedContainer}>
          <View style={styles.employedIconContainer}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
          </View>
          <Text style={styles.alreadyEmployedTitle}>Already Employed</Text>
          <Text style={styles.alreadyEmployedText}>
            You are currently employed with an organization. You can only work for one employer at a time.
          </Text>
          <Text style={styles.alreadyEmployedText}>
            If you want to join a different organization, you need to leave your current employment first.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
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
          title: 'Search Employer',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: Colors.background,
          },
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, name, or email..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setDebouncedQuery('');
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={searchResults || []}
        keyExtractor={(item) => item.organization_id}
        renderItem={renderEmployerCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366F1"
          />
        }
      />
    </View>
  );
}

// Separate component to handle pending request check
function EmployerCard({
  employer,
  onPress,
  userId,
}: {
  employer: EmployerSearchResult;
  onPress: (employer: EmployerSearchResult) => void;
  userId: string;
}) {
  const { data: hasPending, isLoading } = useHasPendingRequest(
    userId,
    employer.organization_id
  );

  return (
    <View style={styles.employerCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.orgIconContainer}>
          <MaterialCommunityIcons name="account-tie" size={28} color={Colors.primary} />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>
            {employer.employer_name || 'Employer'}
          </Text>
          <View style={styles.codeContainer}>
            <MaterialCommunityIcons name="identifier" size={14} color={Colors.primary} />
            <Text style={styles.employerCode}>{employer.employer_code}</Text>
          </View>
        </View>
      </View>

      {/* Employer Info */}
      {employer.employer_email && (
        <View style={styles.cardRow}>
          <View style={styles.cardIconWrapper}>
            <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
          </View>
          <Text style={styles.cardValue} numberOfLines={1}>
            {employer.employer_email}
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.joinButton,
          (hasPending || isLoading) && styles.joinButtonDisabled,
        ]}
        onPress={() => onPress(employer)}
        disabled={hasPending || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : hasPending ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Request Pending</Text>
          </>
        ) : (
          <>
            <Feather name="send" size={16} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Send Join Request</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  // Already Employed State
  alreadyEmployedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing["2xl"],
    gap: Spacing.md,
  },
  employedIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  alreadyEmployedTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  alreadyEmployedText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.lg,
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  // List
  listContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  // Employer Card
  employerCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  orgIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  orgName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  employerCode: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  cardIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  joinButtonDisabled: {
    backgroundColor: Colors.gray400,
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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
  emptyStateTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Tips Container
  tipsContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
