import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface TimePickerProps {
  value: string; // Time string (HH:MM)
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  iconColor?: string;
  iconName?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  iconColor = Colors.gray500,
  iconName = 'time-outline',
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Convert HH:MM string to Date object
  const getDateFromTime = (timeString: string): Date => {
    const now = new Date();
    if (!timeString) return now;

    const [hours, minutes] = timeString.split(':').map(Number);
    now.setHours(hours || 0);
    now.setMinutes(minutes || 0);
    return now;
  };

  const selectedTime = getDateFromTime(value);

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return 'Select time';

    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0);
    date.setMinutes(minutes || 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.inputWrapper, disabled && styles.inputWrapperDisabled]}
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
        accessibilityLabel={`${label || 'Time'}: ${value ? formatDisplayTime(value) : 'not selected'}${required ? ', required' : ''}${disabled ? ', disabled' : ''}`}
        accessibilityRole="button"
        accessibilityHint={disabled ? undefined : "Tap to select time"}
        accessibilityState={{ disabled }}
      >
        <Ionicons name={iconName as any} size={20} color={disabled ? Colors.gray300 : iconColor} />
        <Text style={[styles.inputText, !value && styles.placeholder, disabled && styles.disabledText]}>
          {formatDisplayTime(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={disabled ? Colors.gray300 : Colors.gray500} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <View style={styles.iosPickerActions}>
          <TouchableOpacity
            onPress={() => setShowPicker(false)}
            style={styles.iosButton}
            accessibilityLabel="Done selecting time"
            accessibilityRole="button"
          >
            <Text style={styles.iosButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textTertiary,
  },
  inputWrapperDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray200,
    opacity: 0.7,
  },
  disabledText: {
    color: Colors.gray400,
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
  },
  iosButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.md,
  },
  iosButtonText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
