import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows, Gradients, AnimationPresets } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";

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

function ActionCard({ action, isWide }: { action: QuickAction; isWide?: boolean }) {
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

  return (
    <Animated.View style={[styles.actionCardWrapper, isWide && styles.actionCardWide, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={action.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.iconWrapper, { backgroundColor: action.color + "15" }]}>
          <MaterialCommunityIcons name={action.icon} size={24} color={action.color} />
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
        {action.description && (
          <Text style={styles.actionDescription} numberOfLines={1}>
            {action.description}
          </Text>
        )}
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
      {title && <Text style={styles.sectionTitle}>{title}</Text>}

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                isWide={columns === 2}
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
    color: Colors.text,
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCardWide: {
    minHeight: 100,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Shadows.sm,
  },
  emptyCard: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  actionDescription: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
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
