/**
 * ProfileHero
 *
 * Clean hero profile section for HR Profile with:
 * - Centered avatar with status indicator
 * - Warm saffron gradient background
 * - Settings icon for navigation
 * - Clean typography hierarchy
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { User } from "@/lib/types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ProfileHeroProps {
  user: User | null;
  onSettingsPress?: () => void;
}

const AVATAR_SIZE = 100;

export default function ProfileHero({
  user,
  onSettingsPress,
}: ProfileHeroProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#CC5500", "#E67300", "#FF9933", "#FFB366"]}
      locations={[0, 0.3, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Header Row - Only settings icon (no back button for tab) */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profile</Text>
        {onSettingsPress && (
          <TouchableOpacity
            onPress={onSettingsPress}
            style={styles.settingsButton}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Feather name="settings" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Content - Centered */}
      <Animated.View
        style={[
          styles.profileContent,
          { opacity: fadeAnim },
        ]}
      >
        {/* Avatar */}
        <Animated.View
          style={[
            styles.avatarWrapper,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          {/* Status indicator - always active for logged-in user */}
          <View style={styles.statusIndicator} />
        </Animated.View>

        {/* Name and Email */}
        <View style={styles.nameSection}>
          <Text style={styles.userName}>{user?.full_name || "Unknown"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>

          {/* Owner Badge - only if is_employer */}
          {user?.is_employer && (
            <View style={styles.ownerBadge}>
              <MaterialCommunityIcons name="crown" size={12} color="#FFFFFF" />
              <Text style={styles.ownerBadgeText}>Owner</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing["4xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Profile Content
  profileContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  // Avatar
  avatarWrapper: {
    marginBottom: Spacing.lg,
    position: "relative",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: "#FF9933",
  },

  // Name Section
  nameSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },

  // Owner Badge
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
