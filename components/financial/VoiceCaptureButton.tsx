import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Props for VoiceCaptureButton
 */
interface VoiceCaptureButtonProps {
  /**
   * Callback when button is pressed
   */
  onPress: () => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;

  /**
   * Button variant
   * - 'fab': Floating Action Button (circular, bottom-right)
   * - 'inline': Inline button (rectangular, with text)
   * @default 'fab'
   */
  variant?: 'fab' | 'inline';

  /**
   * Custom button color
   * @default '#0891B2'
   */
  color?: string;

  /**
   * Additional style for the button container
   */
  style?: ViewStyle;

  /**
   * Icon size
   * @default 24 for inline, 28 for FAB
   */
  iconSize?: number;

  /**
   * Button label for inline variant
   * @default 'Voice Input'
   */
  label?: string;
}

/**
 * Voice Capture Button Component
 *
 * A versatile button for initiating voice input with two variants:
 * - FAB (Floating Action Button): Circular button for floating placement
 * - Inline: Rectangular button with label for inline forms
 *
 * @example
 * ```tsx
 * // Floating Action Button
 * <VoiceCaptureButton
 *   variant="fab"
 *   onPress={() => setShowRecording(true)}
 * />
 *
 * // Inline Button
 * <VoiceCaptureButton
 *   variant="inline"
 *   label="Add via Voice"
 *   onPress={() => setShowRecording(true)}
 *   disabled={isProcessing}
 * />
 * ```
 */
export default function VoiceCaptureButton({
  onPress,
  disabled = false,
  isLoading = false,
  variant = 'fab',
  color = '#0891B2',
  style,
  iconSize,
  label = 'Voice Input',
}: VoiceCaptureButtonProps) {
  const defaultIconSize = variant === 'fab' ? 28 : 24;
  const size = iconSize || defaultIconSize;

  // FAB Variant
  if (variant === 'fab') {
    return (
      <TouchableOpacity
        style={[
          styles.fabButton,
          {
            backgroundColor: disabled ? '#D1D5DB' : color,
            shadowColor: color,
          },
          disabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <MaterialCommunityIcons
            name="microphone"
            size={size}
            color={disabled ? '#9CA3AF' : '#FFFFFF'}
          />
        )}
      </TouchableOpacity>
    );
  }

  // Inline Variant
  return (
    <TouchableOpacity
      style={[
        styles.inlineButton,
        {
          backgroundColor: disabled ? '#F3F4F6' : `${color}15`,
          borderColor: disabled ? '#D1D5DB' : color,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <MaterialCommunityIcons
          name="microphone"
          size={size}
          color={disabled ? '#9CA3AF' : color}
        />
      )}
      <Text
        style={[
          styles.inlineButtonText,
          {
            color: disabled ? '#9CA3AF' : color,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 8,
  },
  inlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
