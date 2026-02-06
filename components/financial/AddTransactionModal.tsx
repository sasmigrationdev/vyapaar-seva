import { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatePicker from '@/components/ui/DatePicker';
import { useCategories } from '@/hooks/queries/useFinancial';
import VoiceCaptureButton from './VoiceCaptureButton';
import { FontFamily } from '@/constants/theme';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'income' | 'expense';
    amount: number;
    categoryId: string;
    transactionDate: string;
    description?: string;
    notes?: string;
    paymentMethod?: string;
    referenceNumber?: string;
  }) => void;
  organizationId: string;
  isSubmitting?: boolean;
  onVoiceInput?: () => void;
}

export default function AddTransactionModal({
  visible,
  onClose,
  onSubmit,
  organizationId,
  isSubmitting,
  onVoiceInput,
}: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  const { data: categories, isLoading: loadingCategories } = useCategories(organizationId, type);

  const handleSubmit = () => {
    if (!amount || !categoryId) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      categoryId,
      transactionDate: date,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      paymentMethod,
    });
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategoryId('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setNotes('');
    setPaymentMethod('cash');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'cash' },
    { value: 'bank', label: 'Bank', icon: 'bank' },
    { value: 'upi', label: 'UPI', icon: 'cellphone' },
    { value: 'card', label: 'Card', icon: 'credit-card' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Transaction</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Voice Input Option */}
          {/* {onVoiceInput && (
            <View style={styles.voiceSection}>
              <View style={styles.voiceDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <VoiceCaptureButton
                variant="inline"
                label="Use Voice Input"
                onPress={onVoiceInput}
              />
            </View>
          )} */}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                  onPress={() => {
                    setType('income');
                    setCategoryId('');
                  }}
                >
                  <MaterialCommunityIcons
                    name="arrow-down"
                    size={20}
                    color={type === 'income' ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                  onPress={() => {
                    setType('expense');
                    setCategoryId('');
                  }}
                >
                  <MaterialCommunityIcons
                    name="arrow-up"
                    size={20}
                    color={type === 'expense' ? '#EF4444' : '#94A3B8'}
                  />
                  <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Category *</Text>
              {loadingCategories ? (
                <ActivityIndicator />
              ) : (
                <View style={styles.categoryGrid}>
                  {categories?.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        categoryId === cat.id && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          categoryId === cat.id && styles.categoryTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.section}>
              <Text style={styles.label}>Date *</Text>
              <DatePicker value={date} onChange={setDate} />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentChip,
                      paymentMethod === method.value && styles.paymentChipActive,
                    ]}
                    onPress={() => setPaymentMethod(method.value)}
                  >
                    <MaterialCommunityIcons
                      name={method.icon as any}
                      size={18}
                      color={paymentMethod === method.value ? '#6366F1' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.paymentText,
                        paymentMethod === method.value && styles.paymentTextActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!amount || !categoryId || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!amount || !categoryId || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Add Transaction</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  voiceSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  voiceDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#6366F1',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryChipActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  paymentChipActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  paymentTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
