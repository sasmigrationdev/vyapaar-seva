/**
 * SalaryActionBar
 *
 * Floating action pill for salary management with:
 * - Download bulk salary sheet button
 * - Month picker button
 * - Glassmorphic styling
 */
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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

interface SalaryActionBarProps {
  onDownload: () => void;
  onMonthPicker: () => void;
  isDownloading?: boolean;
  downloadDisabled?: boolean;
}

export default function SalaryActionBar({
  onDownload,
  onMonthPicker,
  isDownloading = false,
  downloadDisabled = false,
}: SalaryActionBarProps) {
  const insets = useSafeAreaInsets();

  const ActionButton = ({
    icon,
    onPress,
    color = Colors.text,
    loading = false,
    disabled = false,
  }: {
    icon: React.ReactNode;
    onPress?: () => void;
    color?: string;
    loading?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : icon}
    </TouchableOpacity>
  );

  const Divider = () => <View style={styles.divider} />;

  const content = (
    <View style={styles.actionsRow}>
      <ActionButton
        icon={
          <Feather
            name="download"
            size={20}
            color={downloadDisabled ? Colors.gray400 : Colors.info}
          />
        }
        onPress={onDownload}
        loading={isDownloading}
        color={Colors.info}
        disabled={downloadDisabled}
      />
      <Divider />
      <ActionButton
        icon={
          <MaterialCommunityIcons
            name="calendar-month"
            size={22}
            color={Colors.primary}
          />
        }
        onPress={onMonthPicker}
        color={Colors.primary}
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
        <View style={styles.androidPill}>{content}</View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: Spacing.xs,
  },
});
