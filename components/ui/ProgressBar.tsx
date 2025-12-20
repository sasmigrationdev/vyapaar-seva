import { View, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  color = '#6366F1',
  backgroundColor = '#E2E8F0',
  height = 6,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.container, { backgroundColor, height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
