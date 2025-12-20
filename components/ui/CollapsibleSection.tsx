import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  icon,
  iconColor = Colors.textSecondary,
  children,
  defaultExpanded = true,
  onToggle,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleSection = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => {
      const newValue = !prev;
      onToggle?.(newValue);
      return newValue;
    });
  }, [onToggle]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleSection}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: iconColor + "25" }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
          )}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {badge !== undefined && badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  badge: {
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronExpanded: {
    transform: [{ rotate: "180deg" }],
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
});
