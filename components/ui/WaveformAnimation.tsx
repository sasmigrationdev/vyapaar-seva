import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

/**
 * Props for WaveformAnimation component
 */
interface WaveformAnimationProps {
  /**
   * Whether the animation is active (recording in progress)
   */
  isActive: boolean;

  /**
   * Number of bars in the waveform
   * @default 5
   */
  barCount?: number;

  /**
   * Color of the waveform bars
   * @default Colors.light.tint
   */
  color?: string;

  /**
   * Width of each bar
   * @default 4
   */
  barWidth?: number;

  /**
   * Gap between bars
   * @default 4
   */
  barGap?: number;

  /**
   * Minimum height of bars
   * @default 8
   */
  minHeight?: number;

  /**
   * Maximum height of bars
   * @default 40
   */
  maxHeight?: number;

  /**
   * Animation duration in milliseconds
   * @default 400
   */
  duration?: number;

  /**
   * Container style
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated waveform visualization for voice recording
 *
 * Displays animated vertical bars that simulate audio waveform during recording.
 * Bars animate up and down with random heights to create a pulsing effect.
 *
 * @example
 * ```tsx
 * <WaveformAnimation
 *   isActive={isRecording}
 *   barCount={5}
 *   color="#0891B2"
 * />
 * ```
 */
export function WaveformAnimation({
  isActive,
  barCount = 5,
  color = Colors.light.tint,
  barWidth = 4,
  barGap = 4,
  minHeight = 8,
  maxHeight = 40,
  duration = 400,
  style,
}: WaveformAnimationProps) {
  // Create animated values for each bar
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(minHeight))
  ).current;

  // Animation loop for each bar
  useEffect(() => {
    if (!isActive) {
      // Reset all bars to minimum height when inactive
      animatedValues.forEach(animValue => {
        Animated.timing(animValue, {
          toValue: minHeight,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Create looping animation for each bar
    const animations = animatedValues.map((animValue, index) => {
      // Stagger the animations slightly for more natural effect
      const delay = index * 50;

      const animate = () => {
        // Random height between min and max
        const targetHeight = minHeight + Math.random() * (maxHeight - minHeight);

        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: targetHeight,
            duration: duration,
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (isActive) {
            animate(); // Loop the animation
          }
        });
      };

      return animate;
    });

    // Start all animations
    animations.forEach(animate => animate());

    // Cleanup function
    return () => {
      animatedValues.forEach(animValue => animValue.stopAnimation());
    };
  }, [isActive, animatedValues, minHeight, maxHeight, duration]);

  return (
    <View style={[styles.container, style]}>
      {animatedValues.map((animValue, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: animValue,
              backgroundColor: color,
              marginHorizontal: barGap / 2,
              borderRadius: barWidth / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  bar: {
    alignSelf: 'center',
  },
});
