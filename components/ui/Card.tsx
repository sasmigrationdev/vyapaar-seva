import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TouchableOpacityProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";

type CardVariant = "default" | "elevated" | "outlined" | "gradient";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

export function Card({
  children,
  variant = "default",
  style,
  onPress,
  disabled = false,
}: CardProps) {
  const cardStyle = [
    styles.card,
    variant === "elevated" && styles.cardElevated,
    variant === "outlined" && styles.cardOutlined,
    disabled && styles.cardDisabled,
    style,
  ];

  if (variant === "gradient") {
    const content = (
      <LinearGradient
        colors={[Colors.secondary, Colors.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.cardGradient, style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  }

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = Colors.secondary,
  trend,
  trendValue,
  onPress,
  style,
}: StatCardProps) {
  return (
    <Card variant="elevated" onPress={onPress} style={[styles.statCard, style]}>
      <View style={styles.statHeader}>
        {icon && (
          <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        )}
        {trend && (
          <View
            style={[
              styles.trendBadge,
              trend === "up" && styles.trendUp,
              trend === "down" && styles.trendDown,
            ]}
          >
            <Ionicons
              name={trend === "up" ? "arrow-up" : trend === "down" ? "arrow-down" : "remove"}
              size={12}
              color={
                trend === "up"
                  ? Colors.success
                  : trend === "down"
                  ? Colors.error
                  : Colors.gray500
              }
            />
            {trendValue && (
              <Text
                style={[
                  styles.trendText,
                  trend === "up" && { color: Colors.success },
                  trend === "down" && { color: Colors.error },
                ]}
              >
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </Card>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function ActionCard({
  title,
  description,
  icon,
  iconColor = Colors.secondary,
  onPress,
  style,
}: ActionCardProps) {
  return (
    <Card variant="elevated" onPress={onPress} style={[styles.actionCard, style]}>
      <View style={[styles.actionIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      {description && <Text style={styles.actionDescription}>{description}</Text>}
      <View style={styles.actionArrow}>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Base card - Modern Minimal with subtle border
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  // Elevated card - slightly more prominent
  cardElevated: {
    borderColor: "rgba(0,0,0,0.03)",
    ...Shadows.md,
  },
  // Outlined card - clean border, no shadow
  cardOutlined: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardGradient: {
    borderRadius: BorderRadius.xl,
    borderWidth: 0,
  },
  cardDisabled: {
    opacity: 0.5,
  },

  // Stat Card - Modern metrics display
  statCard: {
    minWidth: 140,
    padding: Spacing.xl,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  statSubtitle: {
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 4,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    gap: 3,
  },
  trendUp: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  trendDown: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray500,
  },

  // Action Card - Clean horizontal layout
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionArrow: {
    marginLeft: Spacing.md,
    opacity: 0.4,
  },
});

export default Card;
