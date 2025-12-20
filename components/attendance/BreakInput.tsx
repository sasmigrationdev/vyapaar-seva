import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AttendanceBreak } from '@/lib/types';
import TimePicker from '@/components/ui/TimePicker';
import { calculateBreakDuration } from '@/lib/utils/attendance.utils';

interface BreakInputProps {
  date: string; // Date for the break (YYYY-MM-DD)
  checkInTime?: string; // Optional check-in time for validation
  checkOutTime?: string; // Optional check-out time for validation
  initialBreak?: AttendanceBreak; // For editing an existing break
  onSave: (breakItem: AttendanceBreak) => void;
  onCancel: () => void;
}

export default function BreakInput({
  date,
  checkInTime,
  checkOutTime,
  initialBreak,
  onSave,
  onCancel,
}: BreakInputProps) {
  const { error } = useAlert();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialBreak) {
      // Parse existing break times
      const start = new Date(initialBreak.start_time);
      const end = new Date(initialBreak.end_time);
      setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
      setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
      setNotes(initialBreak.notes || '');
    }
  }, [initialBreak]);

  const calculateDuration = (): number | null => {
    if (!startTime || !endTime) return null;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0, 0);

    // If end time is before start time, assume it's the next day
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const duration = calculateBreakDuration(startDate.toISOString(), endDate.toISOString());
    return duration;
  };

  const duration = calculateDuration();

  const handleSave = () => {
    if (!startTime) {
      error('Error', 'Please enter break start time');
      return;
    }

    if (!endTime) {
      error('Error', 'Please enter break end time');
      return;
    }

    if (duration === null || duration <= 0) {
      error('Error', 'Break end time must be after start time');
      return;
    }

    // Create ISO timestamps
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0, 0);

    // If end time is before start time, assume it's the next day
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    // Validate against check-in and check-out times if provided
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);

      if (startDate < checkIn) {
        error('Invalid Time', 'Break cannot start before check-in time');
        return;
      }

      if (endDate > checkOut) {
        error('Invalid Time', 'Break cannot end after check-out time');
        return;
      }
    }

    const breakItem: AttendanceBreak = {
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      duration_minutes: duration,
      notes: notes.trim() || undefined,
    };

    onSave(breakItem);
  };

  const hours = duration ? Math.floor(duration / 60) : 0;
  const minutes = duration ? duration % 60 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="coffee" size={20} color="#F59E0B" />
        </View>
        <Text style={styles.headerTitle}>
          {initialBreak ? 'Edit Break' : 'Add Break'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Start Time */}
        <TimePicker
          value={startTime}
          onChange={setStartTime}
          label="Start Time"
          required
          iconName="play-circle-outline"
          iconColor="#10B981"
        />

        {/* End Time */}
        <TimePicker
          value={endTime}
          onChange={setEndTime}
          label="End Time"
          required
          iconName="stop-circle-outline"
          iconColor="#EF4444"
        />

        {/* Duration Preview */}
        {duration !== null && duration > 0 && (
          <View style={styles.durationPreview}>
            <Ionicons name="timer-outline" size={18} color="#6366F1" />
            <Text style={styles.durationLabel}>Duration:</Text>
            <Text style={styles.durationValue}>
              {hours > 0 && `${hours}h `}
              {minutes}m
            </Text>
          </View>
        )}

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <MaterialCommunityIcons
              name="note-text-outline"
              size={18}
              color="#64748B"
              style={styles.textAreaIcon}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes about this break..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {initialBreak ? 'Update' : 'Add'} Break
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    padding: 14,
    gap: 14,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  durationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
