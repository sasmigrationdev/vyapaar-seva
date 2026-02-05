/**
 * PayrollHeroHeader
 *
 * Modern gradient header for the Payroll screen with:
 * - Saffron gradient background
 * - Rounded bottom corners
 * - "Payroll Management" title with subtitle
 * - Safe area handling
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

interface PayrollHeroHeaderProps {
  subtitle?: string;
}

export default function PayrollHeroHeader({ subtitle }: PayrollHeroHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <LinearGradient
        colors={["#CC5500", "#E67300", "#FF9933", "#FFB366"]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Payroll</Text>
            <Text style={styles.subtitle}>
              {subtitle || "Manage payroll periods"}
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={24}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing["4xl"],
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
