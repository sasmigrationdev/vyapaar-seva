/**
 * PayrollActionBar
 *
 * Floating action bar for payroll management with Create New Period button
 */
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

interface PayrollActionBarProps {
  onCreatePress: () => void;
  currentMonth?: string;
}

export default function PayrollActionBar({
  onCreatePress,
  currentMonth,
}: PayrollActionBarProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <TouchableOpacity
      style={styles.createButton}
      onPress={onCreatePress}
      activeOpacity={0.8}
    >
      <Ionicons name="add-circle" size={22} color={Colors.textInverse} />
      <Text style={styles.createButtonText}>
        {currentMonth ? `Create ${currentMonth} Payroll` : "Create Payroll"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View
      entering={FadeInUp.delay(300).springify()}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="light" style={styles.blurPill}>
          {content}
        </BlurView>
      ) : (
        <View style={styles.androidPill}>{content}</View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  blurPill: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  androidPill: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    margin: 4,
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "600",
  },
});
