import { Colors, Shadows, Spacing, BorderRadius } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

interface ComingSoonFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
}

const COMING_SOON_FEATURES: ComingSoonFeature[] = [
  {
    id: "task-management",
    title: "Task Management",
    description: "Assign & track tasks",
    icon: "clipboard-check-outline",
    color: Colors.info,
    bgColor: "#DBEAFE",
  },
  {
    id: "verification",
    title: "Verification",
    description: "KYC & document verify",
    icon: "shield-check-outline",
    color: Colors.success,
    bgColor: "#D1FAE5",
  },
  {
    id: "itr",
    title: "ITR Lodgement",
    description: "Income tax filing",
    icon: "file-document-outline",
    color: Colors.warning,
    bgColor: "#FEF3C7",
  },
  {
    id: "registrations",
    title: "Registrations",
    description: "GST, MSME, Trademark",
    icon: "domain",
    color: Colors.purple,
    bgColor: "#FAF5FF",
  },
  {
    id: "patent",
    title: "Patent Filing",
    description: "Protect your innovation",
    icon: "lightbulb-outline",
    color: "#D97706",
    bgColor: "#FFFBEB",
  },
];

const CARD_WIDTH = 140;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ComingSoonCarousel() {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="rocket-launch-outline"
              size={18}
              color={Colors.accent}
            />
          </View>
          <View>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.subtitle}>New features on the way</Text>
          </View>
        </View>
      </View>

      {/* Horizontal Scroll Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + Spacing.md}
        decelerationRate="fast"
      >
        {COMING_SOON_FEATURES.map((feature, index) => (
          <Animated.View
            key={feature.id}
            entering={FadeInRight.delay(index * 100).springify()}
            style={styles.cardWrapper}
          >
            <View style={styles.card}>
              {/* Coming Soon Badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Soon</Text>
              </View>

              {/* Icon */}
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: feature.bgColor },
                ]}
              >
                <MaterialCommunityIcons
                  name={feature.icon}
                  size={24}
                  color={feature.color}
                />
              </View>

              {/* Content */}
              <Text style={styles.cardTitle} numberOfLines={1}>
                {feature.title}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {feature.description}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accent + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    minHeight: 150,
    ...Shadows.sm,
  },
  badge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.accent + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 15,
  },
});
