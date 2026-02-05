/**
 * EmployeeTabBar
 *
 * Animated tab navigation with:
 * - Smooth indicator animation
 * - Clean pill-style tabs
 * - Haptic feedback on selection
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useEffect, useRef } from "react";
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export type EmployeeTab = "overview" | "salary" | "bank" | "reports";

interface Tab {
  key: EmployeeTab;
  label: string;
}

const TABS: Tab[] = [
  { key: "overview", label: "Overview" },
  { key: "salary", label: "Salary" },
  { key: "bank", label: "Bank" },
  { key: "reports", label: "Reports" },
];

interface EmployeeTabBarProps {
  activeTab: EmployeeTab;
  onTabChange: (tab: EmployeeTab) => void;
}

export default function EmployeeTabBar({
  activeTab,
  onTabChange,
}: EmployeeTabBarProps) {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<number[]>([]);
  const tabPositions = useRef<number[]>([]);

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    if (tabPositions.current.length > 0 && tabWidths.current.length > 0) {
      Animated.spring(indicatorAnim, {
        toValue: tabPositions.current[activeIndex] || 0,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex]);

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;

    // Initial position for active tab
    if (index === activeIndex) {
      indicatorAnim.setValue(x);
    }
  };

  const handleTabPress = (tab: EmployeeTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  const indicatorWidth = tabWidths.current[activeIndex] || 80;

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorAnim }],
            },
          ]}
        />

        {/* Tabs */}
        {TABS.map((tab, index) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handleTabPress(tab.key)}
              onLayout={(e) => handleTabLayout(index, e)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  tabsWrapper: {
    flexDirection: "row",
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.xl,
    padding: 4,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: "700",
  },
});
