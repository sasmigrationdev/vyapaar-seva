import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WiFiVerificationResult } from "@/lib/utils/wifiVerification.utils";
import { Colors, Typography, Spacing, BorderRadius } from "@/constants/theme";

export type { WiFiVerificationResult };

interface WiFiVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Called when the user confirms the action via the primary button.
   * The actual attendance action is performed here, so nothing happens
   * unless the user explicitly presses the button. Falls back to onClose
   * if not provided.
   */
  onConfirm?: () => void;
  verificationResult: WiFiVerificationResult;
  action: "check-in" | "check-out";
}

export default function WiFiVerificationModal({
  visible,
  onClose,
  onConfirm,
  verificationResult,
  action,
}: WiFiVerificationModalProps) {
  const { currentSsid, isVerified, officeNetworks, isRequired, error, errorType } =
    verificationResult;
  
  // Get appropriate help steps based on error type
  const getHelpSteps = () => {
    switch (errorType) {
      case 'permission_denied':
        return [
          'Open your device Settings app',
          'Go to Apps → Khatabook (or this app) → Permissions',
          'Enable Location permission',
          'Return to the app and try again',
        ];
      case 'location_disabled':
        return [
          'Swipe down from the top of your screen',
          'Long-press the Location icon to open Location settings',
          'Turn on Location Services',
          'Return to the app and try again',
        ];
      case 'wifi_not_connected':
        return [
          'Open your device Settings',
          'Go to WiFi settings',
          'Connect to one of the office WiFi networks listed above',
          'Return to the app and try again',
        ];
      case 'network_error':
        return [
          'Check your internet connection',
          "Make sure you're connected to WiFi",
          'Try closing and reopening the app',
          'If the issue persists, contact HR',
        ];
      default:
        return [
          "Make sure you're connected to office WiFi",
          'Check if your WiFi network name matches one of the allowed networks above',
          "If you're at the office but verification fails, contact HR",
        ];
    }
  };
  
  const helpSteps = getHelpSteps();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={[
            styles.header,
            isVerified ? styles.headerSuccess : styles.headerWarning
          ]}>
            <View style={styles.headerContent}>
              <View style={styles.statusBadge}>
                <View style={isVerified ? styles.pulseDotGreen : styles.pulseDotOrange} />
                <Text style={styles.statusText}>
                  {isVerified ? "Verification Passed" : isRequired ? "Verification Required" : "Not Required"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textInverse} />
              </TouchableOpacity>
            </View>

            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name={isVerified ? "wifi-check" : "wifi-alert"}
                size={40}
                color={Colors.textInverse}
              />
              <View style={styles.titleContent}>
                <Text style={styles.title}>WiFi Verification</Text>
                <Text style={styles.subtitle}>
                  {action === "check-in" ? "Check-In" : "Check-Out"} Location Check
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Connection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="wifi"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>Current Connection</Text>
              </View>
              <View style={styles.connectionCard}>
                <View style={styles.connectionInfo}>
                  <View style={[
                    styles.wifiIconContainer,
                    currentSsid ? styles.wifiIconConnected : styles.wifiIconDisconnected
                  ]}>
                    <MaterialCommunityIcons
                      name={currentSsid ? "wifi" : "wifi-off"}
                      size={24}
                      color={currentSsid ? "#10B981" : "#9CA3AF"}
                    />
                  </View>
                  <View style={styles.connectionDetails}>
                    <Text style={styles.connectionLabel}>Network Name</Text>
                    <Text style={[
                      styles.connectionValue,
                      !currentSsid && styles.connectionValueDisabled
                    ]}>
                      {currentSsid || "Not connected to WiFi"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Office Networks */}
            {isRequired && officeNetworks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="office-building"
                    size={18}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.sectionTitle}>
                    Allowed Office Networks ({officeNetworks.length})
                  </Text>
                </View>
                <View style={styles.networksContainer}>
                  {officeNetworks.map((network, index) => {
                    const isMatch = network === currentSsid;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.networkItem,
                          isMatch && styles.networkItemMatch,
                          index !== officeNetworks.length - 1 && styles.networkItemWithBorder
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isMatch ? "check-circle" : "wifi"}
                          size={20}
                          color={isMatch ? "#10B981" : Colors.textSecondary}
                        />
                        <Text style={[
                          styles.networkName,
                          isMatch && styles.networkNameMatch
                        ]}>
                          {network}
                        </Text>
                        {isMatch && (
                          <View style={styles.matchBadge}>
                            <Text style={styles.matchBadgeText}>✓ MATCHED</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Verification Result */}
            <View style={styles.section}>
              <View style={[
                styles.resultCard,
                isVerified ? styles.resultCardSuccess : styles.resultCardError
              ]}>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons
                    name={isVerified ? "shield-check" : "shield-alert"}
                    size={28}
                    color={isVerified ? "#047857" : "#DC2626"}
                  />
                  <Text style={[
                    styles.resultTitle,
                    isVerified ? styles.resultTitleSuccess : styles.resultTitleError
                  ]}>
                    {isVerified ? "Verification Successful" : isRequired ? "Verification Failed" : "Not Required"}
                  </Text>
                </View>
                <Text style={styles.resultMessage}>
                  {isVerified
                    ? `Connected to authorized office network. Press "Continue" to record your ${
                        action === "check-in" ? "check-in" : "check-out"
                      }.`
                    : isRequired
                    ? `You must connect to one of the allowed office WiFi networks to ${
                        action === "check-in" ? "check in" : "check out"
                      }.`
                    : "WiFi verification is not enabled for your account. You can perform attendance actions from anywhere."}
                </Text>
              </View>
            </View>

            {/* Help Section */}
            {!isVerified && isRequired && (
              <View style={styles.section}>
                <View style={styles.helpCard}>
                  <View style={styles.helpHeader}>
                    <MaterialCommunityIcons
                      name="help-circle"
                      size={24}
                      color="#92400E"
                    />
                    <Text style={styles.helpTitle}>
                      {errorType === 'permission_denied'
                        ? 'Enable Location Permission'
                        : errorType === 'location_disabled'
                        ? 'Turn On Location Services'
                        : errorType === 'wifi_not_connected'
                        ? 'Connect to Office WiFi'
                        : errorType === 'network_error'
                        ? 'Troubleshoot Connection'
                        : 'How to Fix This'}
                    </Text>
                  </View>

                  <View style={styles.helpStepsContainer}>
                    {helpSteps.map((step, index) => (
                      <View key={index} style={styles.helpStep}>
                        <View style={styles.helpStepNumber}>
                          <Text style={styles.helpStepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.helpStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>

                  {error && (
                    <View style={styles.errorBox}>
                      <MaterialCommunityIcons
                        name="alert"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isVerified ? styles.actionButtonSuccess : styles.actionButtonPrimary
              ]}
              onPress={onConfirm ?? onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>
                {isVerified ? "Continue" : "Got It"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    width: "100%",
    maxHeight: "90%",
    overflow: "hidden",
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  headerSuccess: {
    backgroundColor: "#10B981",
  },
  headerWarning: {
    backgroundColor: "#F59E0B",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  pulseDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  content: {
    padding: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  connectionCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  wifiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  wifiIconConnected: {
    backgroundColor: "#D1FAE5",
  },
  wifiIconDisconnected: {
    backgroundColor: Colors.gray200,
  },
  connectionDetails: {
    flex: 1,
  },
  connectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  connectionValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  connectionValueDisabled: {
    color: Colors.textSecondary,
  },
  networksContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  networkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  networkItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  networkItemMatch: {
    backgroundColor: "#D1FAE5",
  },
  networkName: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  networkNameMatch: {
    fontWeight: Typography.fontWeight.semibold,
    color: "#065F46",
  },
  matchBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  matchBadgeText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  resultCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
  },
  resultCardSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  resultCardError: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  resultTitleSuccess: {
    color: "#047857",
  },
  resultTitleError: {
    color: "#DC2626",
  },
  resultMessage: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  helpCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: "#FDE047",
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  helpTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: "#92400E",
  },
  helpStepsContainer: {
    gap: Spacing.sm,
  },
  helpStep: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  helpStepNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FDE047",
    justifyContent: "center",
    alignItems: "center",
  },
  helpStepNumberText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: "#92400E",
  },
  helpStepText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: "#78350F",
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: "#991B1B",
    lineHeight: 18,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonSuccess: {
    backgroundColor: "#10B981",
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
});
