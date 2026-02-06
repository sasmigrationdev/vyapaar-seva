import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  useSharedValue,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

interface TabItemProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  isDark: boolean;
}

function TabItem({ label, isFocused, onPress, onLongPress, icon, isDark }: TabItemProps) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
  }, [isFocused, progress]);

  const containerStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', isDark ? 'rgba(255, 153, 51, 0.15)' : 'rgba(255, 153, 51, 0.1)']
    );

    return {
      backgroundColor: bgColor,
      paddingHorizontal: interpolate(progress.value, [0, 1], [12, 14]),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      maxWidth: interpolate(progress.value, [0, 1], [0, 100]),
      opacity: progress.value,
      marginLeft: interpolate(progress.value, [0, 1], [0, 6]),
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.1]) }],
    };
  });

  const handlePress = () => {
    // Extend haptics to Android (not just iOS)
    if (!isFocused && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: isFocused }}
      accessibilityHint={`Navigate to ${label}`}
      onPress={handlePress}
      onLongPress={onLongPress}
    >
      <Animated.View style={[styles.tabItem, containerStyle]}>
        <Animated.View style={iconStyle}>
          {icon}
        </Animated.View>
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text
            style={[
              styles.tabLabel,
              { color: Colors.primary },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Force light theme to match iOS appearance
  const isDark = false;

  // Filter to only visible tabs (those with tabBarIcon defined)
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    // A tab is visible if it has an icon defined (our visible tabs all have icons)
    return options.tabBarIcon !== undefined;
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing['sm'],
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.border,
        },
      ]}
    >
      <View style={styles.tabsContainer}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];

          // Find the original index in state.routes for focus detection
          const originalIndex = state.routes.findIndex(r => r.key === route.key);

          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

          const isFocused = state.index === originalIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Render the icon
          const icon = options.tabBarIcon({
            focused: isFocused,
            color: isFocused ? Colors.primary : (isDark ? 'rgba(255,255,255,0.5)' : Colors.gray400),
            size: 22,
          });

          return (
            <TabItem
              key={route.key}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              icon={icon}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing['sm'],
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: Spacing['xs'],
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'],
    minHeight: 44,
  },
  textContainer: {
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
