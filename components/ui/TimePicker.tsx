import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

interface TimePickerProps {
  value: string; // Time string (HH:MM)
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  iconColor?: string;
  iconName?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
  required = false,
  iconColor = '#64748B',
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
        style={styles.inputWrapper}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={iconName as any} size={20} color={iconColor} />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {formatDisplayTime(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  placeholder: {
    color: '#94A3B8',
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  iosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  iosButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
