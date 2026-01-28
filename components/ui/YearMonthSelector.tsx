import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { YearFilter, MonthFilter } from '@/lib/types';

interface YearMonthSelectorProps {
  selectedYear: YearFilter;
  selectedMonth: MonthFilter;
  onYearChange: (year: YearFilter) => void;
  onMonthChange: (month: MonthFilter) => void;
  minYear?: number;
  showAllOption?: boolean;
  disabled?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function YearMonthSelector({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  minYear,
  showAllOption = true,
  disabled = false,
}: YearMonthSelectorProps) {
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Generate year options
  const startYear = minYear || currentYear - 5;
  const yearOptions: YearFilter[] = [];
  if (showAllOption) {
    yearOptions.push('all');
  }
  for (let year = currentYear; year >= startYear; year--) {
    yearOptions.push(year);
  }

  // Generate month options based on selected year
  const monthOptions: MonthFilter[] = [];
  if (selectedYear !== 'all' && showAllOption) {
    monthOptions.push('all');
  }
  const maxMonth = selectedYear === currentYear ? currentMonth : 11;
  for (let month = maxMonth; month >= 0; month--) {
    monthOptions.push(month);
  }

  const getYearDisplayText = () => {
    if (selectedYear === 'all') return 'All Years';
    return selectedYear.toString();
  };

  const getMonthDisplayText = () => {
    if (selectedYear === 'all') return 'All Months';
    if (selectedMonth === 'all') return 'All Months';
    return MONTHS[selectedMonth as number];
  };

  const handleYearSelect = (year: YearFilter) => {
    onYearChange(year);
    if (year === 'all') {
      // When "All Years" is selected, month is automatically "all"
      onMonthChange('all');
    } else if (selectedMonth === 'all') {
      // Keep "all" if already selected
    } else {
      // Check if current month is valid for the selected year
      const maxMonth = year === currentYear ? currentMonth : 11;
      if (typeof selectedMonth === 'number' && selectedMonth > maxMonth) {
        onMonthChange(maxMonth);
      }
    }
    setShowYearPicker(false);
  };

  const handleMonthSelect = (month: MonthFilter) => {
    onMonthChange(month);
    setShowMonthPicker(false);
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: (YearFilter | MonthFilter)[],
    selectedValue: YearFilter | MonthFilter,
    onSelect: (value: any) => void,
    getLabel: (value: any) => string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            style={styles.optionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  item === selectedValue && styles.optionItemSelected,
                ]}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    item === selectedValue && styles.optionTextSelected,
                  ]}
                >
                  {getLabel(item)}
                </Text>
                {item === selectedValue && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Year Selector */}
      <TouchableOpacity
        style={[styles.selectorButton, disabled && styles.selectorButtonDisabled]}
        onPress={() => !disabled && setShowYearPicker(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <MaterialCommunityIcons
          name="calendar-blank"
          size={18}
          color={disabled ? Colors.textTertiary : Colors.primary}
        />
        <Text style={[styles.selectorText, disabled && styles.selectorTextDisabled]}>
          {getYearDisplayText()}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? Colors.textTertiary : Colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Month Selector */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          (disabled || selectedYear === 'all') && styles.selectorButtonDisabled,
        ]}
        onPress={() => !disabled && selectedYear !== 'all' && setShowMonthPicker(true)}
        activeOpacity={0.7}
        disabled={disabled || selectedYear === 'all'}
      >
        <MaterialCommunityIcons
          name="calendar-month"
          size={18}
          color={disabled || selectedYear === 'all' ? Colors.textTertiary : Colors.primary}
        />
        <Text
          style={[
            styles.selectorText,
            (disabled || selectedYear === 'all') && styles.selectorTextDisabled,
          ]}
        >
          {getMonthDisplayText()}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled || selectedYear === 'all' ? Colors.textTertiary : Colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Year Picker Modal */}
      {renderPickerModal(
        showYearPicker,
        () => setShowYearPicker(false),
        'Select Year',
        yearOptions,
        selectedYear,
        handleYearSelect,
        (year: YearFilter) => year === 'all' ? 'All Years' : year.toString()
      )}

      {/* Month Picker Modal */}
      {renderPickerModal(
        showMonthPicker,
        () => setShowMonthPicker(false),
        'Select Month',
        monthOptions,
        selectedMonth,
        handleMonthSelect,
        (month: MonthFilter) => month === 'all' ? 'All Months' : MONTHS[month as number]
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  selectorButtonDisabled: {
    backgroundColor: Colors.gray100,
  },
  selectorText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  selectorTextDisabled: {
    color: Colors.textTertiary,
  },
  separator: {
    width: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius['2xl'],
    width: '100%',
    maxWidth: 320,
    maxHeight: '60%',
    ...Shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingVertical: Spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  optionItemSelected: {
    backgroundColor: Colors.primaryLight + '15',
  },
  optionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
});
