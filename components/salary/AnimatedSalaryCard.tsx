import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';

interface AnimatedSalaryCardProps {
  icon: React.ReactNode;
  label: string;
  subtext?: string;
  value: number;
  suffix?: string;
  color: string;
  index?: number;
  formatValue?: (value: number) => string;
  onPress?: () => void;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function AnimatedSalaryCard({
  icon,
  label,
  subtext,
  value,
  suffix = '',
  color,
  index = 0,
  formatValue,
  onPress,
}: AnimatedSalaryCardProps) {
  const animatedValue = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    scale.value = withDelay(
      index * 100,
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 300 })
    );

    // Value counting animation
    animatedValue.value = withDelay(
      index * 100 + 200,
      withTiming(value, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [value, index, animatedValue, scale, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Display value with formatting
  const displayValue = useDerivedValue(() => {
    if (formatValue) {
      return formatValue(Math.round(animatedValue.value));
    }
    return Math.round(animatedValue.value).toLocaleString('en-IN');
  });

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.95, { damping: 15 }, () => {
        scale.value = withSpring(1, { damping: 12 });
      });
      onPress();
    }
  };

  const CardContent = () => (
    <>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {subtext && <Text style={styles.subtext}>{subtext}</Text>}
        </View>
      </View>
      <View style={styles.valueContainer}>
        <Text
          style={[styles.value, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {formatValue ? formatValue(value) : `₹${value.toLocaleString('en-IN')}`}
          {suffix}
        </Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Animated.View style={[styles.container, containerStyle]}>
          <CardContent />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <CardContent />
    </Animated.View>
  );
}

// Compact variant for grid layout
export function CompactSalaryCard({
  icon,
  label,
  value,
  color,
  index = 0,
  formatValue,
}: Omit<AnimatedSalaryCardProps, 'subtext' | 'suffix' | 'onPress'>) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    opacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 300 })
    );
  }, [index, scale, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.compactContainer, containerStyle]}>
      <View style={[styles.compactIconContainer, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text
        style={[styles.compactValue, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatValue ? formatValue(value) : `₹${value.toLocaleString('en-IN')}`}
      </Text>
      <Text style={styles.compactLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    minHeight: 72,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
    maxWidth: '45%',
  },
  value: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  // Compact card styles
  compactContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  compactLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
