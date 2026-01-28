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
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
  checkInTime = null,
}: NeumorphicCheckInButtonProps) {
  const animation = useRef(new Animated.Value(0)).current;
  const breathingAnim = useRef(new Animated.Value(0)).current;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    Animated.timing(animation, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(animation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  // Press animation - button shrinks in center
  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });

  // Shadow decreases when pressed
  const shadowOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.12],
  });

  // Breathing animation interpolations - balanced values
  const breathingScale = breathingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.012],
  });

  const breathingShadowOpacity = breathingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.32, 0.15],
  });

  const breathingShadowRadius = breathingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 20],
  });

  const glowOpacity = breathingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  const size = 240;
  const buttonColor = isCheckedIn ? '#EF4444' : Colors.primary;
  const iconName = isCheckedIn ? 'exit-outline' : 'finger-print';
  const buttonText = isCheckedIn ? 'CHECK OUT' : 'CHECK IN';

  return (
    <View style={styles.container}>
      {/* Breathing glow effect - only when checked in */}
      {isCheckedIn && !loading && !disabled && (
        <Animated.View
          style={[
            styles.glowEffect,
            {
              width: size + 30,
              height: size + 30,
              borderRadius: (size + 30) / 2,
              opacity: glowOpacity,
              backgroundColor: '#F87171',
              transform: [{ scale: breathingScale }],
            },
          ]}
        />
      )}

      {/* Drop shadow layer - stays in place */}
      <View
        style={[
          styles.dropShadow,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
          },
        ]}
      />

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
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
              shadowOpacity: isCheckedIn && !loading ? breathingShadowOpacity : shadowOpacity,
              shadowRadius: isCheckedIn && !loading ? breathingShadowRadius : 12,
              shadowColor: isCheckedIn ? '#EF4444' : '#888',
            },
            disabled && styles.disabledOuter,
          ]}
        >
          {/* Inner white circle */}
          <View
            style={[
              styles.innerCircle,
              {
                width: size - 24,
                height: size - 24,
                borderRadius: (size - 24) / 2,
              },
              disabled && styles.disabledInner,
            ]}
          >
            {/* Content */}
            <View style={styles.content}>
              {loading ? (
                <ActivityIndicator size="large" color={buttonColor} />
              ) : (
                <>
                  <Ionicons
                    name={iconName}
                    size={isCheckedIn ? 36 : 40}
                    color={disabled ? Colors.gray400 : buttonColor}
                  />

                  {/* Timer display when checked in */}
                  {isCheckedIn && checkInTime && (
                    <View style={styles.timerContainer}>
                      <Text style={[styles.timerText, { color: buttonColor }]}>
                        {formatElapsedTime(elapsedSeconds)}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.buttonText,
                      { color: disabled ? Colors.gray400 : buttonColor },
                    ]}
                  >
                    {buttonText}
                  </Text>
                </>
              )}
            </View>
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
    zIndex: -1,
  },
  dropShadow: {
    position: 'absolute',
    backgroundColor: '#D4D7DC',
  },
  outerCircle: {
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4D7DC',
    ...Platform.select({
      ios: {
        shadowColor: '#888',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledOuter: {
    backgroundColor: '#E5E7EB',
  },
  innerCircle: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledInner: {
    backgroundColor: '#F9FAFB',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timerContainer: {
    marginVertical: 4,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
