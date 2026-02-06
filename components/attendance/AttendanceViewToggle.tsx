import React from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export type ViewMode = 'table' | 'calendar';

interface AttendanceViewToggleProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  tableRecordsCount?: number;
}

export default function AttendanceViewToggle({
  activeView,
  onViewChange,
  tableRecordsCount = 0,
}: AttendanceViewToggleProps) {
  const pillPosition = useSharedValue(activeView === 'table' ? 0 : 1);
  const [containerWidth, setContainerWidth] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (view: ViewMode) => {
    if (view === activeView) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pillPosition.value = withSpring(view === 'table' ? 0 : 1, {
      damping: 20,
      stiffness: 200,
    });
    onViewChange(view);
  };

  const pillAnimatedStyle = useAnimatedStyle(() => {
    const buttonWidth = containerWidth / 2 - 4;
    return {
      transform: [
        { translateX: pillPosition.value * buttonWidth },
      ],
      width: buttonWidth,
    };
  });

  const tableTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      pillPosition.value,
      [0, 1],
      [Colors.primary, Colors.textSecondary]
    );
    return { color };
  });

  const calendarTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      pillPosition.value,
      [0, 1],
      [Colors.textSecondary, Colors.primary]
    );
    return { color };
  });

  return (
    <View style={styles.container}>
      <View style={styles.toggleWrapper} onLayout={handleLayout}>
        {/* Sliding pill indicator */}
        <Animated.View style={[styles.pill, pillAnimatedStyle]} />

        {/* Table button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handlePress('table')}
          activeOpacity={0.7}
          accessibilityLabel={`Table view${tableRecordsCount > 0 ? `, ${tableRecordsCount} records` : ''}`}
          accessibilityRole="button"
          accessibilityState={{ selected: activeView === 'table' }}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeView === 'table' ? Colors.primary : Colors.textSecondary}
          />
          <Animated.Text style={[styles.toggleText, tableTextStyle]}>
            Table
          </Animated.Text>
        </TouchableOpacity>

        {/* Calendar button */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => handlePress('calendar')}
          activeOpacity={0.7}
          accessibilityLabel="Calendar view"
          accessibilityRole="button"
          accessibilityState={{ selected: activeView === 'calendar' }}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeView === 'calendar' ? Colors.primary : Colors.textSecondary}
          />
          <Animated.Text style={[styles.toggleText, calendarTextStyle]}>
            Calendar
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: 4,
    position: 'relative',
    ...Shadows.xs,
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
