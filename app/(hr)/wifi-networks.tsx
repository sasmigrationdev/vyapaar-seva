import { useAuth } from "@/hooks/auth/useAuth";
import {
  useAddWiFiNetwork,
  useDeleteWiFiNetwork,
  useUpdateWiFiNetwork,
} from "@/hooks/mutations/useWiFiMutations";
import { useAllWiFiNetworks } from "@/hooks/queries/useWiFi";
import { OfficeWiFiNetwork } from "@/lib/types";
import { getAvailableWiFiNetworks } from "@/lib/utils/wifi.utils";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { Text } from "@/components/ui/Text";
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDate } from '@/lib/utils/date.utils';

export default function WiFiNetworksScreen() {
  const { user } = useAuth();
  const { success, error, info, confirmDestructive } = useAlert();
  const organizationId = user?.organization_id || "";
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all WiFi networks
  const { data: networks, isLoading, refetch } = useAllWiFiNetworks(organizationId, {
    enabled: !!organizationId,
  });

  // Mutations
  const addMutation = useAddWiFiNetwork(organizationId);
  const updateMutation = useUpdateWiFiNetwork(organizationId);
  const deleteMutation = useDeleteWiFiNetwork(organizationId);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [ssid, setSsid] = useState("");
  const [description, setDescription] = useState("");
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleScanNetworks = async () => {
    setIsScanning(true);
    try {
      const networks = await getAvailableWiFiNetworks();
      setAvailableNetworks(networks);
      setShowSuggestions(true);

      if (networks.length === 0) {
        info(
          "No Networks Found",
          "Make sure you're connected to a WiFi network and location permissions are granted."
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Could not scan for WiFi networks. You can still type the network name manually.";

      error(
        "Scan Failed",
        errorMessage
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectNetwork = (networkSsid: string) => {
    setSsid(networkSsid);
    setShowSuggestions(false);
  };

  const handleAddNetwork = async () => {
    if (!ssid.trim()) {
      error("Error", "Please enter a WiFi network name (SSID)");
      return;
    }

    if (!user?.id) {
      error("Error", "User not found");
      return;
    }

    try {
      await addMutation.mutateAsync({
        ssid: ssid.trim(),
        description: description.trim() || undefined,
        createdBy: user.id,
      });

      success("Success", "WiFi network added successfully");
      setSsid("");
      setDescription("");
      setAvailableNetworks([]);
      setShowSuggestions(false);
      setShowAddForm(false);
    } catch (err) {
      error(
        "Error",
        err instanceof Error ? err.message : "Failed to add WiFi network"
      );
    }
  };

  const handleToggleActive = async (network: OfficeWiFiNetwork) => {
    try {
      await updateMutation.mutateAsync({
        networkId: network.id,
        updates: { is_active: !network.is_active },
      });

      success(
        "Success",
        `WiFi network ${network.is_active ? "deactivated" : "activated"}`
      );
    } catch (err) {
      error(
        "Error",
        err instanceof Error ? err.message : "Failed to update WiFi network"
      );
    }
  };

  const handleDeleteNetwork = (network: OfficeWiFiNetwork) => {
    confirmDestructive(
      "Confirm Delete",
      `Are you sure you want to delete the WiFi network "${network.ssid}"?`,
      async () => {
        try {
          await deleteMutation.mutateAsync({ networkId: network.id });
          success("Success", "WiFi network deleted successfully");
        } catch (err) {
          error(
            "Error",
            err instanceof Error
              ? err.message
              : "Failed to delete WiFi network"
          );
        }
      },
      undefined,
      "Delete"
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading WiFi networks...</Text>
      </View>
    );
  }

  const activeCount = networks?.filter(n => n.is_active).length || 0;

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
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroGreeting}>WiFi Networks</Text>
              <View style={styles.heroDatePill}>
                <Feather name="calendar" size={16} color={Colors.textInverse} />
                <Text style={styles.heroDateText}>{formatDate(new Date())}</Text>
              </View>
            </View>
          </View>

          {/* Stats Cards in Hero */}
          <View style={styles.heroMetricsRow}>
            <View style={[styles.heroMetricCard, styles.heroMetricPrimary]}>
              <View style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}>
                <MaterialCommunityIcons name="wifi" size={22} color={Colors.textInverse} />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>total networks</Text>
                <Text style={styles.heroMetricValue}>
                  {networks?.length || 0}
                </Text>
                <Text style={styles.heroMetricMeta}>Configured</Text>
              </View>
            </View>

            <View style={[styles.heroMetricCard, styles.heroMetricSecondary]}>
              <View style={[styles.heroMetricIcon, styles.heroMetricIconOverlay]}>
                <MaterialCommunityIcons name="wifi-check" size={22} color={Colors.textInverse} />
              </View>
              <View style={styles.heroMetricContent}>
                <Text style={styles.heroMetricLabel}>active</Text>
                <Text style={styles.heroMetricValue}>{activeCount}</Text>
                <Text style={styles.heroMetricMeta}>In use</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Add Network Section */}
        {!showAddForm ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.textInverse} />
              <Text style={styles.addButtonText}>Add WiFi Network</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Add Network</Text>
                <TouchableOpacity onPress={() => {
                  setShowAddForm(false);
                  setSsid("");
                  setDescription("");
                  setAvailableNetworks([]);
                  setShowSuggestions(false);
                }}>
                  <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Network Name (SSID)</Text>
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={handleScanNetworks}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="wifi-sync" size={16} color={Colors.primary} />
                        <Text style={styles.scanButtonText}>Scan</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={ssid}
                  onChangeText={setSsid}
                  placeholder="e.g., Office-WiFi"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Available Networks Suggestions */}
                {showSuggestions && availableNetworks.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {availableNetworks.map((network, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectNetwork(network)}
                      >
                        <MaterialCommunityIcons name="wifi" size={18} color={Colors.success} />
                        <Text style={styles.suggestionText}>{network}</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., Main office 2nd floor"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    setSsid("");
                    setDescription("");
                    setAvailableNetworks([]);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    addMutation.isPending && styles.saveButtonDisabled,
                  ]}
                  onPress={handleAddNetwork}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.saveButtonText}>Add Network</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Networks List */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Configured Networks</Text>

          {!networks || networks.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="wifi-off" size={48} color={Colors.gray300} />
              <Text style={styles.emptyStateTitle}>No networks configured</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your first office WiFi network to get started
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {networks.map((network, index) => (
                <View
                  key={network.id}
                  style={[
                    styles.listItem,
                    index === networks.length - 1 && styles.listItemLast
                  ]}
                >
                  <View style={[
                    styles.listIcon,
                    { backgroundColor: network.is_active ? '#d1fae5' : '#f3f4f6' }
                  ]}>
                    <MaterialCommunityIcons
                      name={network.is_active ? "wifi" : "wifi-off"}
                      size={20}
                      color={network.is_active ? '#10b981' : '#9ca3af'}
                    />
                  </View>
                  <View style={styles.listContent}>
                    <Text style={styles.listLabel}>{network.ssid}</Text>
                    <Text style={styles.listMeta}>
                      {network.description || `Added ${new Date(network.created_at).toLocaleDateString()}`}
                    </Text>
                  </View>
                  <View style={styles.listActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleToggleActive(network)}
                      disabled={updateMutation.isPending}
                    >
                      <MaterialCommunityIcons
                        name={network.is_active ? "toggle-switch" : "toggle-switch-off-outline"}
                        size={32}
                        color={network.is_active ? Colors.success : Colors.gray300}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteNetwork(network)}
                      disabled={deleteMutation.isPending}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={22}
                        color={Colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Employees need to be connected to these networks to check in/out when WiFi verification is enabled for them.
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing['md'],
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing['lg'],
  },
  heroSection: {
    marginHorizontal: -Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['5xl'],
    paddingBottom: Spacing['2xl'],
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
    gap: Spacing['lg'],
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing['xl'],
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
  heroMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['md'],
    marginTop: Spacing['sm'],
    marginBottom: Spacing['sm'],
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing['lg'],
    paddingHorizontal: Spacing['lg'],
    gap: Spacing['sm'],
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 90,
  },
  heroMetricPrimary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroMetricSecondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroMetricIcon: {
    width: 48,
    height: 52,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMetricIconOverlay: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroMetricContent: {
    flex: 1,
    gap: Spacing['xs'],
  },
  heroMetricLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
    opacity: 0.72,
    letterSpacing: 0.7,
  },
  heroMetricValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  heroMetricMeta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.75,
  },
  section: {
    gap: Spacing['md'],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    gap: Spacing['sm'],
  },
  addButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  formCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing['lg'],
    gap: Spacing['md'],
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  inputGroup: {
    gap: Spacing['sm'],
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing['xs'],
    paddingHorizontal: Spacing['md'],
    paddingVertical: Spacing['xs'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing['md'],
    paddingVertical: Spacing['md'],
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestionsContainer: {
    gap: Spacing['sm'],
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing['md'],
    paddingVertical: Spacing['md'],
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing['sm'],
  },
  suggestionText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing['md'],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing['md'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing['sm'],
    paddingVertical: Spacing['4xl'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['md'],
    paddingVertical: Spacing['md'],
    paddingHorizontal: Spacing['lg'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
  },
  listLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['xs'],
  },
  actionButton: {
    padding: Spacing['xs'],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['md'],
    padding: Spacing['lg'],
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
