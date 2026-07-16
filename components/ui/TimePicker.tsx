import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, FontFamily, Spacing } from "@/constants/theme";

interface TimePickerProps {
  value: string; // Time string (HH:MM, 24-hour)
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  iconColor?: string;
  iconName?: string;
}

type Period = "AM" | "PM";

const pad2 = (n: number) => String(n).padStart(2, "0");

// Split the stored 24-hour "HH:mm" into the 12-hour parts the numeric fields
// show. Anything empty/invalid becomes blank fields (period defaults to AM).
const parseValue = (
  value: string
): { hour: string; minute: string; period: Period } => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!m) return { hour: "", minute: "", period: "AM" };
  const h24 = Number(m[1]);
  const min = Number(m[2]);
  if (h24 < 0 || h24 > 23 || min < 0 || min > 59) {
    return { hour: "", minute: "", period: "AM" };
  }
  const period: Period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: pad2(h12), minute: pad2(min), period };
};

// Rebuild the stored 24-hour "HH:mm" from the 12-hour fields. Returns null while
// the entry is incomplete/out-of-range so the parent treats it as "no time" and
// validation can block the submit (rather than saving a bogus value).
const toValue = (hour: string, minute: string, period: Period): string | null => {
  if (hour === "" || minute === "") return null;
  const h12 = Number(hour);
  const min = Number(minute);
  if (!(h12 >= 1 && h12 <= 12) || !(min >= 0 && min <= 59)) return null;
  let h24 = h12 % 12; // 12 -> 0 (handles 12 AM)
  if (period === "PM") h24 += 12; // 12 PM -> 12, 1 PM -> 13, etc.
  return `${pad2(h24)}:${pad2(min)}`;
};

export default function TimePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  iconColor = Colors.gray500,
  iconName = "time-outline",
}: TimePickerProps) {
  const initial = parseValue(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<Period>(initial.period);

  // The last "HH:mm" we emitted upward. Used so an external value change (prefill
  // / reset) re-syncs the fields, while our own emissions don't bounce back and
  // fight the user's typing.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const p = parseValue(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const emit = (h: string, m: string, p: Period) => {
    const out = toValue(h, m, p) ?? "";
    lastEmitted.current = out;
    onChange(out);
  };

  const handleHourChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 2);
    setHour(digits);
    emit(digits, minute, period);
  };

  const handleMinuteChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 2);
    setMinute(digits);
    emit(hour, digits, period);
  };

  const handleHourBlur = () => {
    if (hour === "") return;
    let h = Number(hour);
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    const hh = pad2(h);
    if (hh !== hour) {
      setHour(hh);
      emit(hh, minute, period);
    }
  };

  const handleMinuteBlur = () => {
    if (minute === "") return;
    let m = Number(minute);
    if (m < 0) m = 0;
    if (m > 59) m = 59;
    const mm = pad2(m);
    if (mm !== minute) {
      setMinute(mm);
      emit(hour, mm, period);
    }
  };

  const selectPeriod = (p: Period) => {
    if (disabled) return;
    setPeriod(p);
    emit(hour, minute, p);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View style={[styles.row, disabled && styles.rowDisabled]}>
        <Ionicons
          name={iconName as any}
          size={20}
          color={disabled ? Colors.gray300 : iconColor}
        />

        <View style={styles.fields}>
          <TextInput
            style={[styles.timeBox, disabled && styles.disabledText]}
            value={hour}
            onChangeText={handleHourChange}
            onBlur={handleHourBlur}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="09"
            placeholderTextColor={Colors.textTertiary}
            editable={!disabled}
            selectTextOnFocus
            accessibilityLabel={`${label || "Time"} hour`}
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={[styles.timeBox, disabled && styles.disabledText]}
            value={minute}
            onChangeText={handleMinuteChange}
            onBlur={handleMinuteBlur}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="00"
            placeholderTextColor={Colors.textTertiary}
            editable={!disabled}
            selectTextOnFocus
            accessibilityLabel={`${label || "Time"} minute`}
          />
        </View>

        <View style={styles.periodToggle}>
          {(["AM", "PM"] as Period[]).map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, active && styles.periodButtonActive]}
                onPress={() => selectPeriod(p)}
                activeOpacity={disabled ? 1 : 0.7}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                accessibilityLabel={p}
              >
                <Text
                  style={[
                    styles.periodText,
                    active && styles.periodTextActive,
                    disabled && styles.disabledText,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  rowDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray200,
    opacity: 0.7,
  },
  fields: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timeBox: {
    minWidth: 52,
    textAlign: "center",
    fontSize: 20,
    fontFamily: FontFamily.semibold,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  colon: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  periodButtonActive: {
    backgroundColor: Colors.indigo,
  },
  periodText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.textInverse,
  },
  disabledText: {
    color: Colors.gray400,
  },
});
