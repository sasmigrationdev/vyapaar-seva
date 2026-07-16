import { useMemo, useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, FontFamily, Shadows, Spacing } from "@/constants/theme";

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Parse "YYYY-MM-DD" as a LOCAL calendar date so the day can never shift by a
// timezone offset. Falls back to today when empty/invalid.
const parseLocal = (value: string): { year: number; month: number; day: number } => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
};

// Compare two dates by calendar day only (ignore time).
const ymd = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const selected = parseLocal(value);
  // The month currently shown in the calendar grid. Seeded from the value (or
  // today) each time the modal opens.
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  const open = () => {
    if (disabled) return;
    const p = parseLocal(value);
    setViewYear(p.year);
    setViewMonth(p.month);
    setShowPicker(true);
  };

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [viewYear, viewMonth]);

  const isOutOfRange = (day: number): boolean => {
    const key = ymd(new Date(viewYear, viewMonth, day));
    if (minimumDate && key < ymd(minimumDate)) return true;
    if (maximumDate && key > ymd(maximumDate)) return true;
    return false;
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    if (isOutOfRange(day)) return;
    onChange(`${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`);
    setShowPicker(false);
  };

  const isSelectedDay = (day: number) =>
    value &&
    selected.year === viewYear &&
    selected.month === viewMonth &&
    selected.day === day;

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "Select date";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!m) return "Select date";
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
        onPress={open}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
        accessibilityLabel={`${label || "Date"}: ${
          value ? formatDisplayDate(value) : "not selected"
        }${required ? ", required" : ""}`}
        accessibilityRole="button"
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={disabled ? Colors.gray300 : Colors.gray500}
        />
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholder,
            disabled && styles.disabledText,
          ]}
        >
          {formatDisplayDate(value)}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? Colors.gray300 : Colors.gray500}
        />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
            {/* Month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={goPrevMonth}
                style={styles.navButton}
                accessibilityLabel="Previous month"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity
                onPress={goNextMonth}
                style={styles.navButton}
                accessibilityLabel="Next month"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-forward" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <View key={w} style={styles.weekCell}>
                  <Text style={styles.weekText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) {
                  return <View key={`blank-${i}`} style={styles.dayCell} />;
                }
                const out = isOutOfRange(day);
                const active = isSelectedDay(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={styles.dayCell}
                    onPress={() => selectDay(day)}
                    disabled={out}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!active, disabled: out }}
                  >
                    <View style={[styles.dayInner, active && styles.dayInnerActive]}>
                      <Text
                        style={[
                          styles.dayText,
                          active && styles.dayTextActive,
                          out && styles.dayTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPicker(false)}
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: FontFamily.regular,
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  monthLabel: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  weekText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textTertiary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  dayInner: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  dayInnerActive: {
    backgroundColor: Colors.indigo,
  },
  dayText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: Colors.text,
  },
  dayTextActive: {
    color: Colors.textInverse,
    fontFamily: FontFamily.bold,
  },
  dayTextDisabled: {
    color: Colors.gray300,
  },
  closeButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
  },
  closeButtonText: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
  },
});
