/**
 * CashbookActionBar
 *
 * Sleek floating action pill for Cashbook screen with:
 * - Add Transaction (primary)
 * - Voice Input
 * - Categories/Settings
 * - Glassmorphic styling
 */
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Text } from "@/components/ui/Text";

interface CashbookActionBarProps {
  onAddTransaction: () => void;
  onVoiceInput: () => void;
  onOpenCategories: () => void;
  isVoiceLoading?: boolean;
}

export default function CashbookActionBar({
  onAddTransaction,
  onVoiceInput,
  onOpenCategories,
  isVoiceLoading = false,
}: CashbookActionBarProps) {
  const insets = useSafeAreaInsets();

  const ActionButton = ({
    icon,
    onPress,
    color = Colors.text,
    loading = false,
    disabled = false,
    isPrimary = false,
    label,
  }: {
    icon: React.ReactNode;
    onPress?: () => void;
    color?: string;
    loading?: boolean;
    disabled?: boolean;
    isPrimary?: boolean;
    label?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
        isPrimary && styles.actionButtonPrimary,
      ]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? Colors.textInverse : color} />
      ) : (
        <>
          {icon}
          {label && (
            <Text style={[styles.actionLabel, isPrimary && styles.actionLabelPrimary]}>
              {label}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  const Divider = () => <View style={styles.divider} />;

  const content = (
    <View style={styles.actionsRow}>
      <ActionButton
        icon={<MaterialCommunityIcons name="shape-outline" size={20} color={Colors.textSecondary} />}
        onPress={onOpenCategories}
      />
      <Divider />
      <ActionButton
        icon={<Ionicons name="mic" size={20} color={Colors.purple} />}
        onPress={onVoiceInput}
        color={Colors.purple}
        loading={isVoiceLoading}
      />
      <Divider />
      <ActionButton
        icon={<Ionicons name="add" size={22} color={Colors.textInverse} />}
        onPress={onAddTransaction}
        isPrimary
        label="Add"
      />
    </View>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(300).springify()}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="light" style={styles.blurPill}>
          {content}
        </BlurView>
      ) : (
        <View style={styles.androidPill}>
          {content}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  blurPill: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  androidPill: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  actionButton: {
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  actionLabelPrimary: {
    color: Colors.textInverse,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: Spacing.xs,
  },
});
