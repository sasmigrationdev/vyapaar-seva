import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  isLoading: boolean;
  children: React.ReactNode;
}

/**
 * SkeletonLoader - Displays a shimmer effect while loading,
 * then shows children when data is ready.
 */
export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.md,
  style,
  isLoading,
  children,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isLoading]);

  if (!isLoading) {
    return <>{children}</>;
  }

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonTextProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

/**
 * SkeletonText - A pre-configured skeleton for text placeholders
 */
export function SkeletonText({
  width = "60%",
  height = 16,
  style,
}: SkeletonTextProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: BorderRadius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * SkeletonCircle - A pre-configured skeleton for circular elements (avatars, icons)
 */
export function SkeletonCircle({ size = 40, style }: SkeletonCircleProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  height?: number;
  style?: ViewStyle;
}

/**
 * SkeletonCard - A pre-configured skeleton for card placeholders
 */
export function SkeletonCard({ height = 100, style }: SkeletonCardProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        styles.card,
        {
          height,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonStatProps {
  valueWidth?: number;
  labelWidth?: number;
  style?: ViewStyle;
}

/**
 * SkeletonStat - A pre-configured skeleton for stat/metric displays
 */
export function SkeletonStat({
  valueWidth = 48,
  labelWidth = 64,
  style,
}: SkeletonStatProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.statContainer, style]}>
      <Animated.View
        style={[
          styles.skeleton,
          {
            width: valueWidth,
            height: 24,
            borderRadius: BorderRadius.sm,
            opacity,
            marginBottom: Spacing.xs,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.skeleton,
          {
            width: labelWidth,
            height: 12,
            borderRadius: BorderRadius.sm,
            opacity,
          },
        ]}
      />
    </View>
  );
}

/**
 * LoadingPlaceholder - A simple "---" text placeholder for inline loading states
 */
export function LoadingPlaceholder() {
  return (
    <Animated.View style={styles.placeholder}>
      <View style={styles.placeholderDash} />
      <View style={styles.placeholderDash} />
      <View style={styles.placeholderDash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.gray200,
  },
  card: {
    width: "100%",
    borderRadius: BorderRadius.xl,
  },
  statContainer: {
    alignItems: "center",
  },
  placeholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  placeholderDash: {
    width: 6,
    height: 2,
    backgroundColor: Colors.gray300,
    borderRadius: 1,
  },
});

export default SkeletonLoader;
