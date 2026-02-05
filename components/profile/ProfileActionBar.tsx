/**
 * ProfileActionBar
 *
 * Floating action bar for profile screen with:
 * - Glassmorphic styling (BlurView on iOS)
 * - Edit Profile and Sign Out buttons
 * - Compact pill design
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Typography } from "@/constants/theme";
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

interface ProfileActionBarProps {
  onEditProfile?: () => void;
  onSignOut: () => void;
  isSigningOut?: boolean;
}

export default function ProfileActionBar({
  onEditProfile,
  onSignOut,
  isSigningOut = false,
}: ProfileActionBarProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={styles.actionsRow}>
      {onEditProfile && (
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onEditProfile}
            activeOpacity={0.6}
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
          >
            <Feather name="edit-2" size={18} color={Colors.primary} />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
        </>
      )}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onSignOut}
        activeOpacity={0.6}
        disabled={isSigningOut}
        accessibilityLabel="Sign Out"
        accessibilityRole="button"
        accessibilityState={{ disabled: isSigningOut }}
      >
        {isSigningOut ? (
          <ActivityIndicator size="small" color={Colors.error} />
        ) : (
          <>
            <MaterialCommunityIcons name="logout" size={18} color={Colors.error} />
            <Text style={[styles.actionText, styles.signOutText]}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(400).springify()}
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
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  signOutText: {
    color: Colors.error,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: Spacing.xs,
  },
});
