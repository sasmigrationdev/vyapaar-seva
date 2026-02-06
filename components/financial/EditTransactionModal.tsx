import { useState, useEffect } from 'react';
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
import { FontFamily } from '@/constants/theme';

interface EditTransactionModalProps {
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
  initialData?: {
    type?: 'income' | 'expense';
    amount?: string;
    categoryId?: string;
    categoryName?: string;
    transactionDate?: string;
    description?: string;
    notes?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    transcribedText?: string;
    confidence?: number;
  };
}

export default function EditTransactionModal({
  visible,
  onClose,
  onSubmit,
  organizationId,
  isSubmitting,
  initialData,
}: EditTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { data: categories, isLoading: loadingCategories } = useCategories(organizationId, type);

  // Prefill form with initial data when modal opens
  useEffect(() => {
    if (visible && initialData) {
      setType(initialData.type || 'expense');
      setAmount(initialData.amount || '');
      setCategoryId(initialData.categoryId || '');
      setDate(initialData.transactionDate || new Date().toISOString().split('T')[0]);
      setDescription(initialData.description || '');
      setNotes(initialData.notes || '');
      setPaymentMethod(initialData.paymentMethod || 'cash');
      setReferenceNumber(initialData.referenceNumber || '');
    }
  }, [visible, initialData]);

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
      referenceNumber: referenceNumber.trim() || undefined,
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
    setReferenceNumber('');
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
    { value: 'cheque', label: 'Cheque', icon: 'checkbook' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Edit Transaction</Text>
              <View style={styles.voiceBadge}>
                <MaterialCommunityIcons name="microphone" size={14} color="#6366F1" />
                <Text style={styles.voiceBadgeText}>Voice Input</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Transcribed Text Reference */}
          {initialData?.transcribedText && (
            <View style={styles.transcribedSection}>
              <MaterialCommunityIcons name="text-box" size={16} color="#64748B" />
              <Text style={styles.transcribedLabel}>Transcribed: </Text>
              <Text style={styles.transcribedText} numberOfLines={2}>
                "{initialData.transcribedText}"
              </Text>
            </View>
          )}

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

            {/* Reference Number */}
            <View style={styles.section}>
              <Text style={styles.label}>Reference Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reference number"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!amount || !categoryId) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!amount || !categoryId || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Save Transaction</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  voiceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  closeButton: {
    padding: 4,
  },
  transcribedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  transcribedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  transcribedText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeTextActive: {
    color: '#6366F1',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  paymentChipActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  paymentTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
