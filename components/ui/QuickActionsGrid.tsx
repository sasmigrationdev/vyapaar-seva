import { Text } from "@/components/ui/Text";
import { AnimationPresets, BorderRadius, Colors, Gradients, Shadows, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  gradientColors?: readonly [string, string, string];
  onPress: () => void;
  badge?: number;
  description?: string;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
  title?: string;
  columns?: 2 | 3 | 4;
}

function ActionCard({ action, columns = 2 }: { action: QuickAction; columns?: 2 | 3 | 4 }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      tension: 120,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.actionCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={action.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={action.description ? `${action.label}: ${action.description}` : action.label}
        accessibilityRole="button"
        accessibilityHint={`Navigate to ${action.label}`}
      >
        <View style={[styles.iconWrapper, { backgroundColor: action.color + "15" }]}>
          <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
          {action.badge !== undefined && action.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {action.badge > 99 ? "99+" : action.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.actionLabel} numberOfLines={1}>
          {action.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GradientActionCard({ action }: { action: QuickAction }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: AnimationPresets.pressScale,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const gradientColors = action.gradientColors || Gradients.saffronHero;

  return (
    <Animated.View style={[styles.gradientCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.gradientCard}
        onPress={action.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={action.label}
        accessibilityRole="button"
        accessibilityHint={`Navigate to ${action.label}`}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.gradientIconWrapper}>
            <MaterialCommunityIcons name={action.icon} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.gradientLabel} numberOfLines={1}>
            {action.label}
          </Text>
          {action.badge !== undefined && action.badge > 0 && (
            <View style={styles.gradientBadge}>
              <Text style={styles.gradientBadgeText}>
                {action.badge > 99 ? "99+" : action.badge}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuickActionsGrid({
  actions,
  title = "Quick Actions",
  columns = 2,
}: QuickActionsGridProps) {
  const rows = [];
  for (let i = 0; i < actions.length; i += columns) {
    rows.push(actions.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {/* {title && <Text style={styles.sectionTitle}>{title}</Text>} */}

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                columns={columns}
              />
            ))}
            {/* Fill empty spaces in last row */}
            {row.length < columns &&
              Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={[styles.actionCardWrapper, styles.emptyCard]} />
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// Alternative: Horizontal featured + grid layout
export function QuickActionsHybrid({
  featuredAction,
  actions,
  title = "Quick Actions",
}: {
  featuredAction: QuickAction;
  actions: QuickAction[];
  title?: string;
}) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}

      {/* Featured action with gradient */}
      <GradientActionCard action={featuredAction} />

      {/* Grid of other actions */}
      <View style={styles.grid}>
        <View style={styles.row}>
          {actions.slice(0, 4).map((action) => (
            <ActionCard key={action.id} action={action} isWide />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.3,
    paddingHorizontal: 22,
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: "transparent",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FAFAFA",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  gradientCardWrapper: {
    marginHorizontal: Spacing.lg,
  },
  gradientCard: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.md,
  },
  gradientBackground: {
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  gradientIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  gradientBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  gradientBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
