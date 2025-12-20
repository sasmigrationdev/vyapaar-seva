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
import { FinancialCategory } from '@/lib/types/financial.types';

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: 'income' | 'expense';
    color?: string;
  }) => void;
  category?: FinancialCategory | null;
  isSubmitting?: boolean;
}

const PRESET_COLORS = [
  '#10B981', '#059669', '#34D399', // Greens for income
  '#EF4444', '#DC2626', '#F87171', // Reds for expense
  '#6366F1', '#4F46E5', '#818CF8', // Blues
  '#F59E0B', '#F97316', '#FBBF24', // Oranges
  '#8B5CF6', '#A78BFA', '#C084FC', // Purples
  '#EC4899', '#F472B6', '#FB7185', // Pinks
];

export default function CategoryModal({
  visible,
  onClose,
  onSubmit,
  category,
  isSubmitting,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [color, setColor] = useState('#6B7280');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
    } else {
      resetForm();
    }
  }, [category]);

  const resetForm = () => {
    setName('');
    setType('expense');
    setColor('#6B7280');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
      color,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {category ? 'Edit Category' : 'Add Category'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                  onPress={() => setType('income')}
                  disabled={!!category}
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
                  onPress={() => setType('expense')}
                  disabled={!!category}
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
              {category && (
                <Text style={styles.hint}>Type cannot be changed for existing categories</Text>
              )}
            </View>

            {/* Category Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Category Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Office Supplies"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {/* Color Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((presetColor) => (
                  <TouchableOpacity
                    key={presetColor}
                    style={[
                      styles.colorOption,
                      { backgroundColor: presetColor },
                      color === presetColor && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(presetColor)}
                  >
                    {color === presetColor && (
                      <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.label}>Preview</Text>
              <View style={styles.preview}>
                <View style={[styles.previewDot, { backgroundColor: color }]} />
                <Text style={styles.previewText}>{name || 'Category Name'}</Text>
                <Text style={styles.previewType}>
                  {type === 'income' ? '(Income)' : '(Expense)'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!name.trim() || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {category ? 'Update' : 'Create'}
                </Text>
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
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
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
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#0F172A',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  previewType: {
    fontSize: 13,
    color: '#64748B',
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
