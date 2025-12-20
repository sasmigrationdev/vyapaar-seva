import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedDate = value ? new Date(value) : new Date();

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      onChange(isoDate);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
        <Ionicons name="calendar-outline" size={20} color="#64748B" />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {formatDisplayDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
