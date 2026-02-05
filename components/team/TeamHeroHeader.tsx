/**
 * TeamHeroHeader
 *
 * Modern gradient header for the Team screen with:
 * - Saffron gradient background
 * - Rounded bottom corners
 * - "Team" title with add employee button
 * - Safe area handling
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

interface TeamHeroHeaderProps {
  onAddPress: () => void;
}

export default function TeamHeroHeader({ onAddPress }: TeamHeroHeaderProps) {
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
            <Text style={styles.title}>Team</Text>
            <Text style={styles.subtitle}>Manage your employees</Text>
          </View>

          <TouchableOpacity
            onPress={onAddPress}
            style={styles.addButton}
            activeOpacity={0.8}
            accessibilityLabel="Add new employee"
            accessibilityRole="button"
          >
            <Ionicons name="person-add" size={20} color={Colors.primary} />
          </TouchableOpacity>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
