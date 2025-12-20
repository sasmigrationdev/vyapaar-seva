import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AttendanceRecord, AttendanceBreak } from '@/lib/types';
import { useUpdateBreaks } from '@/hooks/mutations/useAttendanceMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import BreaksList from '@/components/attendance/BreaksList';
import BreakInput from '@/components/attendance/BreakInput';
import { parseBreaks, formatBreakSummary } from '@/lib/utils/attendance.utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BreakManagementModalProps {
  visible: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceRecord;
}

export default function BreakManagementModal({
  visible,
  onClose,
  attendanceRecord,
}: BreakManagementModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error, confirmDestructive } = useAlert();
  const [breaks, setBreaks] = useState<AttendanceBreak[]>([]);
  const [showAddBreak, setShowAddBreak] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateBreaksMutation = useUpdateBreaks(user?.id || '', {
    onSuccess: () => {
      success('Success', 'Breaks updated successfully');
      onClose();
    },
    onError: (err) => {
      error('Error', err.message || 'Failed to update breaks');
    },
  });

  useEffect(() => {
    if (visible && attendanceRecord) {
      // Parse existing breaks from the record
      const existingBreaks = parseBreaks(attendanceRecord.breaks);
      setBreaks(existingBreaks);
      setShowAddBreak(false);
      setEditingIndex(null);
    }
  }, [visible, attendanceRecord]);

  const handleAddBreak = (breakItem: AttendanceBreak) => {
    setBreaks([...breaks, breakItem]);
    setShowAddBreak(false);
  };

  const handleEditBreak = (index: number, breakItem: AttendanceBreak) => {
    const updatedBreaks = [...breaks];
    updatedBreaks[index] = breakItem;
    setBreaks(updatedBreaks);
    setEditingIndex(null);
  };

  const handleDeleteBreak = (index: number) => {
    confirmDestructive(
      'Delete Break',
      'Are you sure you want to delete this break?',
      () => {
        const updatedBreaks = breaks.filter((_, i) => i !== index);
        setBreaks(updatedBreaks);
      }
    );
  };

  const handleSave = () => {
    if (!attendanceRecord.id) {
      error('Error', 'Invalid attendance record');
      return;
    }

    updateBreaksMutation.mutate({
      recordId: attendanceRecord.id,
      breaks,
    });
  };

  const hasChanges = () => {
    const existingBreaks = parseBreaks(attendanceRecord.breaks);
    return JSON.stringify(breaks) !== JSON.stringify(existingBreaks);
  };

  const canAddBreaks = attendanceRecord.check_in_time && attendanceRecord.check_out_time;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="coffee" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Manage Breaks</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {!canAddBreaks ? (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Incomplete Attendance</Text>
                  <Text style={styles.warningText}>
                    You can only add breaks after completing your attendance (checking out).
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Current Breaks</Text>
                  <Text style={styles.summaryValue}>{formatBreakSummary(breaks)}</Text>
                </View>

                {/* Breaks List */}
                {!showAddBreak && editingIndex === null && (
                  <>
                    <BreaksList
                      breaks={breaks}
                      onEdit={(index, breakItem) => setEditingIndex(index)}
                      onDelete={handleDeleteBreak}
                      editable
                    />

                    {/* Add Break Button */}
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setShowAddBreak(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={20} color="#6366F1" />
                      <Text style={styles.addButtonText}>Add Break</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Add/Edit Break Form */}
                {(showAddBreak || editingIndex !== null) && (
                  <BreakInput
                    date={attendanceRecord.date}
                    checkInTime={attendanceRecord.check_in_time || undefined}
                    checkOutTime={attendanceRecord.check_out_time || undefined}
                    initialBreak={editingIndex !== null ? breaks[editingIndex] : undefined}
                    onSave={(breakItem) => {
                      if (editingIndex !== null) {
                        handleEditBreak(editingIndex, breakItem);
                      } else {
                        handleAddBreak(breakItem);
                      }
                    }}
                    onCancel={() => {
                      setShowAddBreak(false);
                      setEditingIndex(null);
                    }}
                  />
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {canAddBreaks && !showAddBreak && editingIndex === null && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.footerButton, styles.cancelFooterButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelFooterButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.saveFooterButton,
                  (!hasChanges() || updateBreaksMutation.isPending) && styles.saveFooterButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasChanges() || updateBreaksMutation.isPending}
                activeOpacity={0.8}
              >
                {updateBreaksMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveFooterButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelFooterButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelFooterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  saveFooterButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveFooterButtonDisabled: {
    opacity: 0.5,
  },
  saveFooterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
