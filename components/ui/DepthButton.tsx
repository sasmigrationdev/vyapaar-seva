import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors, BorderRadius, Typography, AnimationPresets } from '@/constants/theme';

interface DepthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  depthHeight?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantColors = {
  primary: {
    surface: Colors.primary,
    depth: Colors.primaryDark,
    text: Colors.textInverse,
  },
  danger: {
    surface: Colors.error,
    depth: Colors.errorDark,
    text: Colors.textInverse,
  },
  success: {
    surface: Colors.success,
    depth: Colors.successDark,
    text: Colors.textInverse,
  },
  warning: {
    surface: Colors.warning,
    depth: Colors.warningDark,
    text: Colors.textInverse,
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: Typography.fontSize.sm,
    iconSize: 16,
    borderRadius: 10,
    depthHeight: 4,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: Typography.fontSize.base,
    iconSize: 18,
    borderRadius: 12,
    depthHeight: 5,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: Typography.fontSize.lg,
    iconSize: 22,
    borderRadius: 14,
    depthHeight: 6,
  },
};

export function DepthButton({
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  style,
  depthHeight: customDepthHeight,
  accessibilityLabel,
  accessibilityHint,
}: DepthButtonProps) {
  const animation = useRef(new Animated.Value(0)).current;
  const colors = variantColors[variant];
  const sizeConfig = sizeStyles[size];
  const depthHeight = customDepthHeight ?? sizeConfig.depthHeight;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(animation, {
      toValue: 1,
      damping: AnimationPresets.springConfig.damping,
      stiffness: AnimationPresets.springConfig.stiffness * 2, // Faster response for button press
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(animation, {
      toValue: 0,
      damping: AnimationPresets.springConfig.damping,
      stiffness: AnimationPresets.springConfig.stiffness,
      useNativeDriver: false,
    }).start();
  };

  // Interpolate the animated value for the 3D effect
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, depthHeight],
  });

  const surfaceShadowOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  });

  const surfaceScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Depth layer (shadow/base) */}
      <View
        style={[
          styles.depthLayer,
          {
            backgroundColor: disabled ? Colors.gray400 : colors.depth,
            borderRadius: sizeConfig.borderRadius,
            height: '100%',
            bottom: 0,
          },
        ]}
      />

      {/* Surface layer (main button) */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        <Animated.View
          style={[
            styles.surface,
            {
              backgroundColor: disabled ? Colors.gray300 : colors.surface,
              paddingVertical: sizeConfig.paddingVertical,
              paddingHorizontal: sizeConfig.paddingHorizontal,
              borderRadius: sizeConfig.borderRadius,
              transform: [
                { translateY },
                { scale: surfaceScale },
              ],
              shadowOpacity: surfaceShadowOpacity,
              marginBottom: depthHeight,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text
                style={[
                  styles.text,
                  {
                    fontSize: sizeConfig.fontSize,
                    color: disabled ? Colors.gray500 : colors.text,
                  },
                ]}
              >
                {children}
              </Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  depthLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5, // Offset to show depth
  },
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
});
