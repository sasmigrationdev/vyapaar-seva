import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/Text';
import { Colors, AnimationPresets } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { safeRadius } from '@/lib/utils/style.utils';

interface NeumorphicCheckInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  isCheckedIn?: boolean;
  size?: number;
  checkInTime?: string | null; // ISO timestamp of check-in
}

// Format elapsed time as HH:MM:SS
const formatElapsedTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function NeumorphicCheckInButton({
  onPress,
  disabled = false,
  loading = false,
  isCheckedIn = false,
  size = 160,
  checkInTime = null,
}: NeumorphicCheckInButtonProps) {
  const animation = useRef(new Animated.Value(0)).current;
  const shadowLift = useRef(new Animated.Value(0)).current;
  const breathingAnim = useRef(new Animated.Value(0)).current;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Scale content based on size
  const iconSize = Math.round(size * 0.17);
  const timerFontSize = Math.round(size * 0.145);
  const labelFontSize = Math.round(size * 0.068);
  const innerMargin = Math.round(size * 0.08);

  // Calculate elapsed time
  const calculateElapsed = useCallback(() => {
    if (!checkInTime) return 0;
    const checkIn = new Date(checkInTime).getTime();
    const now = Date.now();
    return Math.floor((now - checkIn) / 1000);
  }, [checkInTime]);

  // Timer effect - updates every second when checked in
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) {
      setElapsedSeconds(0);
      return;
    }

    // Initial calculation
    setElapsedSeconds(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime, calculateElapsed]);

  // Breathing animation effect - runs when checked in
  useEffect(() => {
    if (isCheckedIn && !loading && !disabled) {
      // Create smooth breathing animation loop
      const breathingLoop = Animated.loop(
        Animated.sequence([
          // Breathe in (expand)
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
          // Breathe out (contract)
          Animated.timing(breathingAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
        ])
      );
      breathingLoop.start();

      return () => {
        breathingLoop.stop();
        breathingAnim.setValue(0);
      };
    } else {
      breathingAnim.setValue(0);
    }
  }, [isCheckedIn, loading, disabled, breathingAnim]);

  const handlePressIn = () => {
    if (disabled || loading) return;

    // Heavy haptic on press (anticipation)
    if (Platform.OS !== 'web' && AnimationPresets.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    Animated.parallel([
      // Deeper press (0.93 instead of 0.96)
      Animated.timing(animation, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
      // Shadow lifts (inverse effect - gets lighter)
      Animated.timing(shadowLift, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;

    // Light haptic on release (completion)
    if (Platform.OS !== 'web' && AnimationPresets.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Spring-based release (satisfying bounce-back)
    Animated.parallel([
      Animated.spring(animation, {
        toValue: 0,
        damping: 12,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(shadowLift, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Enhanced scale interpolation (deeper press)
  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.93],
  });

  // Shadow decreases when pressed
  const shadowOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.08],
  });

  // Shadow animation (lifts when pressed)
  const shadowTranslateY = shadowLift.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 1],
  });

  // Mid shadow lift
  const midShadowTranslateY = shadowLift.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 2],
  });

  // Far shadow lift
  const farShadowTranslateY = shadowLift.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 4],
  });

  // Breathing animation interpolations - slightly more pronounced
  const breathingScale = breathingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.018, 1],
  });

  // Shadow opacity pulses with breathing
  const breathingShadowOpacity = breathingAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: [0.12, 0.20, 0.28, 0.20, 0.12],
  });

  const breathingShadowRadius = breathingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 22],
  });

  // Glow ring opacity for breathing effect
  const glowRingOpacity = breathingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.45, 0.15],
  });

  // Background glow effect
  const glowOpacity = breathingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.35, 0],
  });

  const buttonColor = isCheckedIn ? Colors.error : Colors.primary;
  const iconName = isCheckedIn ? 'exit-outline' : 'finger-print';
  const buttonText = isCheckedIn ? 'CHECK OUT' : 'CHECK IN';

  return (
    <View style={styles.container}>
      {/* Breathing glow effect - only when checked in */}
      {isCheckedIn && !loading && !disabled && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowEffect,
            {
              width: size + 40,
              height: size + 40,
              borderRadius: (size + 40) / 2,
              opacity: glowOpacity,
              backgroundColor: Colors.errorLight,
              transform: [{ scale: breathingScale }],
            },
          ]}
        />
      )}

      {/* Glowing ring around button (breathing) */}
      {isCheckedIn && !loading && !disabled && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowRing,
            {
              width: size + 28,
              height: size + 28,
              borderRadius: (size + 28) / 2,
              borderWidth: 3,
              borderColor: Colors.error,
              opacity: glowRingOpacity,
              transform: [{ scale: breathingScale }],
            },
          ]}
        />
      )}

      {/* Layer 1: Far shadow (ambient occlusion) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadowFar,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: isCheckedIn ? 'rgba(239,68,68,0.06)' : 'rgba(0,0,0,0.04)',
            transform: [{ translateY: farShadowTranslateY }],
          },
        ]}
      />

      {/* Layer 2: Mid shadow (main depth indicator) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadowMid,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) / 2,
            backgroundColor: isCheckedIn ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.07)',
            transform: [{ translateY: midShadowTranslateY }],
            opacity: isCheckedIn && !loading ? breathingShadowOpacity : shadowOpacity,
          },
        ]}
      />

      {/* Layer 3: Near/contact shadow (sharpest) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadowNear,
          {
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            backgroundColor: isCheckedIn ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.05)',
            transform: [{ translateY: shadowTranslateY }],
          },
        ]}
      />

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityLabel={isCheckedIn ? "Check out from work" : "Check in to work"}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        accessibilityHint={isCheckedIn ? "Double-tap to end your work session and check out" : "Double-tap to start your work session and check in"}
      >
        <Animated.View
          style={[
            styles.outerCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [
                { scale: isCheckedIn && !loading ? breathingScale : scale },
              ],
              // iOS: colored animated shadows, Android: standard elevation
              ...(Platform.OS === 'ios' && {
                shadowOpacity: isCheckedIn && !loading ? breathingShadowOpacity : shadowOpacity,
                shadowRadius: isCheckedIn && !loading ? breathingShadowRadius : 12,
                shadowColor: isCheckedIn ? Colors.error : Colors.gray500,
              }),
              // Beveled edge effect - light from top-left
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderTopColor: 'rgba(255,255,255,0.4)',
              borderLeftColor: 'rgba(255,255,255,0.3)',
              borderBottomWidth: 1.5,
              borderRightWidth: 1.5,
              borderBottomColor: 'rgba(0,0,0,0.08)',
              borderRightColor: 'rgba(0,0,0,0.06)',
            },
            disabled && styles.disabledOuter,
          ]}
        >
          {/* Inner white circle */}
          <View
            style={[
              styles.innerCircle,
              {
                width: size - innerMargin * 2,
                height: size - innerMargin * 2,
                borderRadius: safeRadius((size - innerMargin * 2) / 2),
              },
              disabled && styles.disabledInner,
            ]}
          >
            {/* Top highlight (light source indicator) */}
            <View
              style={[
                styles.innerHighlight,
                {
                  top: Math.round(size * 0.02),
                  left: '18%',
                  right: '18%',
                  height: Math.round(size * 0.08),
                  borderRadius: Math.round(size * 0.04),
                },
              ]}
            />

            {/* Content */}
            <View style={styles.content}>
              {loading ? (
                <ActivityIndicator size="large" color={buttonColor} />
              ) : (
                <>
                  <Ionicons
                    name={iconName}
                    size={isCheckedIn ? iconSize : iconSize + 4}
                    color={disabled ? Colors.gray400 : buttonColor}
                  />

                  {/* Timer display when checked in */}
                  {isCheckedIn && checkInTime && (
                    <View style={styles.timerContainer}>
                      <Text style={[styles.timerText, { color: buttonColor, fontSize: timerFontSize }]}>
                        {formatElapsedTime(elapsedSeconds)}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: disabled ? Colors.gray400 : buttonColor,
                        fontSize: labelFontSize,
                      },
                    ]}
                  >
                    {buttonText}
                  </Text>
                </>
              )}
            </View>

            {/* Bottom shadow (depth indicator) */}
            <View
              style={[
                styles.innerShadow,
                {
                  bottom: Math.round(size * 0.06),
                  left: '22%',
                  right: '22%',
                  height: Math.round(size * 0.05),
                  borderRadius: Math.round(size * 0.025),
                },
              ]}
            />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  glowEffect: {
    position: 'absolute',
    zIndex: -2,
  },
  glowRing: {
    position: 'absolute',
    zIndex: -1,
  },
  shadowFar: {
    position: 'absolute',
    zIndex: 0,
  },
  shadowMid: {
    position: 'absolute',
    zIndex: 1,
  },
  shadowNear: {
    position: 'absolute',
    zIndex: 2,
  },
  outerCircle: {
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.gray500,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  disabledOuter: {
    backgroundColor: Colors.gray200,
    borderTopColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
  },
  innerCircle: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabledInner: {
    backgroundColor: Colors.backgroundSecondary,
  },
  innerHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.6)',
    opacity: 0.5,
  },
  innerShadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timerContainer: {
    marginVertical: 2,
  },
  timerText: {
    fontWeight: '700',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  buttonText: {
    fontWeight: '700',
    letterSpacing: 1,
  },
});
