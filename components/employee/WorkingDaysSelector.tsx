import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { WeekDay } from '@/lib/types';
import { ALL_WEEKDAYS, getWeekdayDisplayName } from '@/lib/utils/workingDays.utils';

interface WorkingDaysSelectorProps {
  selectedDays: WeekDay[];
  onDaysChange: (days: WeekDay[]) => void;
  label?: string;
  required?: boolean;
}

export default function WorkingDaysSelector({
  selectedDays,
  onDaysChange,
  label = 'Working Days',
  required = false,
}: WorkingDaysSelectorProps) {
  const toggleDay = (day: WeekDay) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter(d => d !== day));
    } else {
      onDaysChange([...selectedDays, day]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.daysGrid}>
        {ALL_WEEKDAYS.map(day => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              selectedDays.includes(day) && styles.dayButtonActive,
            ]}
            onPress={() => toggleDay(day)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayText,
                selectedDays.includes(day) && styles.dayTextActive,
              ]}
            >
              {getWeekdayDisplayName(day).slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedDays.length === 0 && (
        <Text style={styles.helperText}>Select at least one working day</Text>
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
    marginBottom: 12,
  },
  required: {
    color: '#EF4444',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
});
