/**
 * EmployeeHeroProfile
 *
 * Clean hero profile section with:
 * - Centered avatar with status indicator
 * - Gradient background with smooth curves
 * - Clean typography hierarchy
 * - Identity focused (no stats - those go in BentoStats)
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, StatusColors } from "@/constants/theme";
import { User } from "@/lib/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EmployeeHeroProfileProps {
  employee: User;
  onEditPress: () => void;
}

const AVATAR_SIZE = 88;

export default function EmployeeHeroProfile({
  employee,
  onEditPress,
}: EmployeeHeroProfileProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const baseSalary = Number(employee.base_salary || 0);
  const hourlyRate = Number(employee.hourly_rate || 0);
  const isActive = employee.is_active;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  // Status configuration
  const getStatus = () => {
    if (!isActive) {
      return { label: "Inactive", color: Colors.gray400, bgColor: Colors.gray100 };
    }
    if (baseSalary > 0 || hourlyRate > 0) {
      return { label: "Active", color: Colors.success, bgColor: StatusColors.approved.background };
    }
    return { label: "Setup Required", color: StatusColors.pending.text, bgColor: StatusColors.pending.background };
  };

  const status = getStatus();

  return (
    <LinearGradient
      colors={["#CC5500", "#E67300", "#FF9933", "#FFB366"]}
      locations={[0, 0.3, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      {/* Navigation Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Employee</Text>

        <TouchableOpacity
          onPress={onEditPress}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Profile Content - Centered */}
      <View style={styles.profileContent}>
        {/* Avatar */}
        <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {employee.full_name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          {/* Status indicator */}
          <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
        </Animated.View>

        {/* Name and Meta */}
        <View style={styles.nameSection}>
          <Text style={styles.employeeName}>{employee.full_name || "Unknown"}</Text>

          <View style={styles.metaRow}>
            {employee.employee_id && (
              <View style={styles.idBadge}>
                <MaterialCommunityIcons name="identifier" size={12} color="#FFFFFF" />
                <Text style={styles.idText}>{employee.employee_id}</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          {(employee.designation || employee.department) && (
            <Text style={styles.roleText}>
              {[employee.designation, employee.department].filter(Boolean).join(" • ")}
            </Text>
          )}
        </View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing["3xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },

  // Navigation
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
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
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#FF9933",
  },

  // Name Section
  nameSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  idText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  roleText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textAlign: "center",
  },
});
