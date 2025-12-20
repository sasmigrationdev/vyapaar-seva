import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Typography, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
  badge?: number;
}

interface QuickActionsRowProps {
  actions: QuickAction[];
  title?: string;
}

export default function QuickActionsRow({ actions, title = "Quick Actions" }: QuickActionsRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={action.icon}
                size={20}
                color={action.color}
              />
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
        ))}
      </ScrollView>
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
    paddingHorizontal: Spacing["lg"],
  },
  scrollView: {
    overflow: "visible",
  },
  scrollContent: {
    paddingLeft: Spacing["lg"],
    paddingRight: Spacing["xl"],
    gap: Spacing.sm,
  },
  actionItem: {
    alignItems: "center",
    gap: Spacing.xs,
    width: 64,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
