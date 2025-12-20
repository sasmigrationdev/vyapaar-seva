import { Text } from "@/components/ui/Text";
import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCreatePayrollPeriod, useGeneratePayrollRecords } from "@/hooks/mutations/usePayrollMutations";
import { useCheckPayrollPeriodExists } from "@/hooks/queries/usePayroll";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";

export default function CreatePayrollPeriod() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error, info } = useAlert();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [notes, setNotes] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const createMutation = useCreatePayrollPeriod();
  const generateMutation = useGeneratePayrollRecords();

  // Check if period already exists
  const { data: periodExists, isLoading: checkingExists } = useCheckPayrollPeriodExists(
    user?.organization_id || "",
    selectedMonth,
    selectedYear
  );

  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1] || "";
  };

  const getMonthDateRange = (month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const handleCreatePayroll = async () => {
    if (!user?.organization_id || !user?.id) {
      error("Error", "Organization or user information not found");
      return;
    }

    if (periodExists) {
      info(
        "Period Already Exists",
        `A payroll period for ${getMonthName(selectedMonth)} ${selectedYear} already exists.`
      );
      return;
    }

    const { startDate, endDate } = getMonthDateRange(selectedMonth, selectedYear);

    try {
      // Step 1: Create payroll period
      const period = await createMutation.mutateAsync({
        organizationId: user.organization_id,
        month: selectedMonth,
        year: selectedYear,
        startDate,
        endDate,
        initiatedBy: user.id,
        notes: notes || undefined,
      });

      // Step 2: Generate salary records
      const generateResult = await generateMutation.mutateAsync({
        payrollPeriodId: period.id,
        organizationId: user.organization_id,
        month: selectedMonth,
        year: selectedYear,
        createdBy: user.id,
      });

      if (generateResult.success) {
        success(
          "Success",
          `Payroll period created successfully!\n\n${generateResult.recordsCreated} salary records generated.${
            generateResult.errors.length > 0
              ? `\n\n${generateResult.errors.length} errors occurred.`
              : ""
          }`,
          () => {
            router.replace(`/(hr)/payroll/${period.id}`);
          }
        );
      } else {
        info(
          "Partial Success",
          `Payroll period created but some records failed to generate.\n\n${generateResult.recordsCreated} records created\n${generateResult.errors.length} errors`,
          () => {
            router.replace(`/(hr)/payroll/${period.id}`);
          }
        );
      }
    } catch (err: any) {
      console.error("Error creating payroll:", err);
      error(
        "Error",
        err?.message || "Failed to create payroll period. Please try again."
      );
    }
  };

  const isCreating = createMutation.isPending || generateMutation.isPending;

  // Generate list of months for selection
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  // Generate list of years (current year and last 2 years)
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Creating a Payroll Period</Text>
            <Text style={styles.infoText}>
              This will initialize a new payroll period and automatically generate salary records
              for all active employees based on their attendance data.
            </Text>
          </View>
        </View>

        {/* Month & Year Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Period</Text>
          <View style={styles.sectionBody}>
            {/* Month Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Month</Text>
              <View style={styles.pickerRow}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.pickerChip,
                      selectedMonth === month.value && styles.pickerChipActive,
                    ]}
                    onPress={() => setSelectedMonth(month.value)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        selectedMonth === month.value && styles.pickerChipTextActive,
                      ]}
                    >
                      {month.label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Year Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Year</Text>
              <View style={styles.yearRow}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearChip,
                      selectedYear === year && styles.yearChipActive,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        selectedYear === year && styles.yearChipTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Selected Period Preview */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <MaterialCommunityIcons
              name="calendar-month"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.previewTitle}>Selected Period</Text>
          </View>
          <Text style={styles.previewPeriod}>
            {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          <Text style={styles.previewDates}>
            {getMonthDateRange(selectedMonth, selectedYear).startDate} to{" "}
            {getMonthDateRange(selectedMonth, selectedYear).endDate}
          </Text>

          {checkingExists ? (
            <View style={styles.previewChecking}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.previewCheckingText}>Checking availability…</Text>
            </View>
          ) : periodExists ? (
            <View style={styles.previewWarning}>
              <Ionicons name="warning" size={16} color="#f59e0b" />
              <Text style={styles.previewWarningText}>
                A payroll period for this month already exists
              </Text>
            </View>
          ) : (
            <View style={styles.previewSuccess}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={styles.previewSuccessText}>Available for creation</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (Optional)</Text>
          <View style={styles.sectionBody}>
            <TextInput
              style={styles.textArea}
              placeholder="Add any notes or comments about this payroll period..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            (isCreating || periodExists) && styles.createButtonDisabled,
          ]}
          onPress={handleCreatePayroll}
          disabled={isCreating || periodExists}
          activeOpacity={0.7}
        >
          {isCreating ? (
            <>
              <ActivityIndicator size="small" color={Colors.textInverse} />
              <Text style={styles.createButtonText}>
                {createMutation.isPending ? "Creating Period…" : "Generating Records…"}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={Colors.textInverse} />
              <Text style={styles.createButtonText}>Create Payroll Period</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing["2xl"],
    paddingBottom: Spacing["5xl"],
    gap: Spacing["xl"],
  },
  infoCard: {
    flexDirection: "row",
    gap: Spacing["md"],
    backgroundColor: Colors.primary + "10",
    borderRadius: BorderRadius.xl,
    padding: Spacing["lg"],
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
    gap: Spacing["xs"],
  },
  infoTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    gap: Spacing["sm"],
  },
  sectionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionBody: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing["lg"],
    gap: Spacing["lg"],
  },
  inputGroup: {
    gap: Spacing["sm"],
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing["sm"],
  },
  pickerChip: {
    paddingHorizontal: Spacing["md"],
    paddingVertical: Spacing["sm"],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  pickerChipTextActive: {
    color: Colors.textInverse,
  },
  yearRow: {
    flexDirection: "row",
    gap: Spacing["sm"],
  },
  yearChip: {
    flex: 1,
    paddingVertical: Spacing["md"],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  yearChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  yearChipText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  yearChipTextActive: {
    color: Colors.textInverse,
  },
  previewCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing["xl"],
    gap: Spacing["sm"],
    alignItems: "center",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["sm"],
  },
  previewTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewPeriod: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  previewDates: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  previewChecking: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["sm"],
    marginTop: Spacing["sm"],
    paddingVertical: Spacing["sm"],
    paddingHorizontal: Spacing["md"],
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  previewCheckingText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  previewWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["sm"],
    marginTop: Spacing["sm"],
    paddingVertical: Spacing["sm"],
    paddingHorizontal: Spacing["md"],
    backgroundColor: "#fef3c7",
    borderRadius: BorderRadius.lg,
  },
  previewWarningText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: "#f59e0b",
  },
  previewSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing["sm"],
    marginTop: Spacing["sm"],
    paddingVertical: Spacing["sm"],
    paddingHorizontal: Spacing["md"],
    backgroundColor: "#dcfce7",
    borderRadius: BorderRadius.lg,
  },
  previewSuccessText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: "#16a34a",
  },
  textArea: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing["md"],
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    minHeight: 100,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["sm"],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing["lg"],
    paddingHorizontal: Spacing["xl"],
  },
  createButtonDisabled: {
    backgroundColor: Colors.gray300,
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
});
