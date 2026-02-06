import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { formatCurrency } from '@/lib/utils/salary.utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface EarningsProgressRingProps {
  earned: number;
  expected: number;
  hoursWorked: number;
  expectedHours: number;
  isLoading?: boolean;
}

const RING_SIZE = 140;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function EarningsProgressRing({
  earned,
  expected,
  hoursWorked,
  expectedHours,
  isLoading = false,
}: EarningsProgressRingProps) {
  const progress = useSharedValue(0);
  const displayValue = useSharedValue(0);

  const percentage = expected > 0 ? Math.min((earned / expected) * 100, 100) : 0;

  useEffect(() => {
    if (!isLoading) {
      progress.value = withDelay(
        300,
        withTiming(percentage / 100, {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        })
      );
      displayValue.value = withDelay(
        300,
        withTiming(earned, {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [percentage, earned, isLoading, progress, displayValue]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  const getProgressColor = () => {
    if (percentage >= 90) return Colors.success;
    if (percentage >= 70) return Colors.primary;
    if (percentage >= 50) return Colors.warning;
    return Colors.error;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonRing} />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.container}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={getProgressColor()} />
              <Stop offset="100%" stopColor={getProgressColor() + 'CC'} />
            </LinearGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={Colors.gray200}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Progress circle */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="url(#progressGradient)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedCircleProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
          <Text style={styles.earnedLabel}>earned</Text>
        </View>
      </View>

      {/* Stats below ring */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getProgressColor() }]}>
            {formatCurrency(earned)}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(expected)}</Text>
          <Text style={styles.statLabel}>Expected</Text>
        </View>
      </View>

      {/* Hours progress */}
      <View style={styles.hoursProgress}>
        <View style={styles.hoursProgressBar}>
          <View
            style={[
              styles.hoursProgressFill,
              {
                width: `${expectedHours > 0 ? Math.min((hoursWorked / expectedHours) * 100, 100) : 0}%`,
                backgroundColor: Colors.info,
              },
            ]}
          />
        </View>
        <Text style={styles.hoursText}>
          {hoursWorked.toFixed(1)} / {expectedHours.toFixed(1)} hrs
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  ringContainer: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  earnedLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  hoursProgress: {
    width: '100%',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  hoursProgressBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  hoursProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  hoursText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  skeletonRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.gray200,
  },
});
