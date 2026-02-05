/**
 * BankTab
 *
 * Bank account display with:
 * - Credit card style visual
 * - Masked account number
 * - Clean info layout
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { User } from "@/lib/types";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import AnimatedRN, { FadeIn } from "react-native-reanimated";

interface BankTabProps {
  employee: User;
  onEditPress: () => void;
}

export default function BankTab({ employee, onEditPress }: BankTabProps) {
  const hasBankDetails = Boolean(employee.bank_name || employee.account_number);

  // Mask account number (show last 4 digits)
  const maskAccountNumber = (accountNumber: string | null | undefined) => {
    if (!accountNumber) return null;
    const last4 = accountNumber.slice(-4);
    return `**** **** **** ${last4}`;
  };

  if (!hasBankDetails) {
    return (
      <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrapper}>
            <MaterialCommunityIcons name="bank-off" size={40} color={Colors.gray400} />
          </View>
          <Text style={styles.emptyTitle}>No Bank Details</Text>
          <Text style={styles.emptySubtitle}>
            Add bank account details to enable salary transfers and generate payment slips
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onEditPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Add Bank Account</Text>
          </TouchableOpacity>
        </View>
      </AnimatedRN.View>
    );
  }

  return (
    <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Bank Card - Credit Card Style */}
      <View style={styles.bankCardWrapper}>
        <LinearGradient
          colors={["#0F766E", "#0D9488", "#14B8A6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bankCard}
        >
          {/* Card Top */}
          <View style={styles.cardTop}>
            <View style={styles.bankIconWrapper}>
              <MaterialCommunityIcons name="bank" size={24} color="#FFFFFF" />
            </View>
            <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
              <Feather name="edit-2" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Bank Name */}
          <Text style={styles.bankName}>
            {employee.bank_name?.toUpperCase() || "BANK NAME"}
          </Text>

          {/* Account Number */}
          <Text style={styles.accountNumber}>
            {maskAccountNumber(employee.account_number) || "**** **** **** ****"}
          </Text>

          {/* Card Bottom */}
          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>ACCOUNT HOLDER</Text>
              <Text style={styles.cardValue}>
                {employee.account_holder_name?.toUpperCase() || employee.full_name?.toUpperCase() || "NAME"}
              </Text>
            </View>
            <View style={styles.ifscWrapper}>
              <Text style={styles.cardLabel}>IFSC</Text>
              <Text style={styles.cardValue}>
                {employee.ifsc_code || "—"}
              </Text>
            </View>
          </View>

          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </LinearGradient>
      </View>

      {/* Additional Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.detailsList}>
          <DetailRow
            icon={<MaterialCommunityIcons name="bank" size={18} color={Colors.gray500} />}
            label="Bank Name"
            value={employee.bank_name}
          />
          <DetailRow
            icon={<Ionicons name="person-outline" size={18} color={Colors.gray500} />}
            label="Account Holder"
            value={employee.account_holder_name || employee.full_name}
          />
          <DetailRow
            icon={<MaterialCommunityIcons name="numeric" size={18} color={Colors.gray500} />}
            label="Account Number"
            value={employee.account_number}
          />
          <DetailRow
            icon={<MaterialCommunityIcons name="bank-transfer" size={18} color={Colors.gray500} />}
            label="IFSC Code"
            value={employee.ifsc_code}
          />
          {employee.branch_name && (
            <DetailRow
              icon={<MaterialCommunityIcons name="map-marker-outline" size={18} color={Colors.gray500} />}
              label="Branch"
              value={employee.branch_name}
            />
          )}
        </View>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
        <Text style={styles.securityText}>
          Bank details are encrypted and stored securely
        </Text>
      </View>
    </AnimatedRN.View>
  );
}

// Detail Row Component
interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <View style={styles.detailIcon}>{icon}</View>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, !value && styles.detailValueEmpty]}>
        {value || "Not set"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },

  // Bank Card
  bankCardWrapper: {
    ...Shadows.lg,
    borderRadius: BorderRadius["2xl"],
  },
  bankCard: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    overflow: "hidden",
    minHeight: 200,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  bankIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bankName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  accountNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  ifscWrapper: {
    alignItems: "flex-end",
  },

  // Decorative circles
  decorCircle1: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorCircle2: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // Details Card
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  detailsList: {
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: "50%",
    textAlign: "right",
  },
  detailValueEmpty: {
    color: Colors.gray400,
    fontWeight: "400",
  },

  // Security Note
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  securityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
