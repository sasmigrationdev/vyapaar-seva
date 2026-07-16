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

  // Convert HH:MM string to a Date (seconds/ms zeroed so the value is stable).
  const getDateFromTime = (timeString: string): Date => {
    const base = new Date();
    if (!timeString) {
      base.setSeconds(0, 0);
      return base;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    base.setHours(hours || 0, minutes || 0, 0, 0);
    return base;
  };

  // Stable Date backing the native picker. Deriving the picker's `value` from
  // `new Date()` on every render made it drift each render, so on iOS the spinner
  // kept snapping back while the user scrolled and the time couldn't be set. We
  // hold a stable Date and only change it when the user actually moves the wheel.
  const [pickerDate, setPickerDate] = useState<Date>(() => getDateFromTime(value));

  const emitTime = (d: Date) => {
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    onChange(`${hours}:${minutes}`);
  };

  const openPicker = () => {
    if (disabled) return;
    setPickerDate(getDateFromTime(value));
    setShowPicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    // Android: the dialog commits and dismisses in a single step.
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event?.type === 'set' && selectedDate) {
        emitTime(selectedDate);
      }
      return;
    }

    // iOS spinner: only track the wheel LOCALLY while the user scrolls.
    // Committing to the parent form on every tick re-renders the modal, and the
    // controlled `value` then fights the native wheel — which made it snap back
    // to the prefilled time (05:30). We commit once, on Done (confirmIOSTime).
    if (selectedDate) {
      setPickerDate(selectedDate);
    }
  };

  // iOS only: commit the wheel's current value when the user taps Done.
  const confirmIOSTime = () => {
    emitTime(pickerDate);
    setShowPicker(false);
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
        onPress={openPicker}
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
          value={pickerDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <View style={styles.iosPickerActions}>
          <TouchableOpacity
            onPress={confirmIOSTime}
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
