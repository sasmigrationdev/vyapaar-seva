import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useDeleteAttendance,
  useMarkAttendance,
  useUpdateAttendance,
} from "@/hooks/mutations/useAttendanceMutations";
import { useBreakRequestsByAttendance } from "@/hooks/queries/useBreakRequests";
import { useAllUsers } from "@/hooks/queries/useUser";
import { useAllAttendanceRecords } from "@/hooks/queries/useAttendance";
import { AttendanceRecord, WeekDay } from "@/lib/types";
import {
  calculateApprovedBreakHours,
  formatBreakDurationFromRequests,
  formatHours,
} from "@/lib/utils/attendance.utils";
import {
  getWeekdayShortName,
  isWorkingDay,
} from "@/lib/utils/workingDays.utils";
import { timeFromStoredTimestamp } from "@/lib/utils/date.utils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Colors, Spacing, BorderRadius, Shadows, StatusColors, FontFamily } from "@/constants/theme";
import AlertModal, { AlertType, AlertButton } from "@/components/ui/AlertModal";
import { useAlert } from "@/hooks/useAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MarkAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  existingRecord?: AttendanceRecord;
  employeeId?: string;
  initialDate?: string;
}

export default function MarkAttendanceModal({
  visible,
  onClose,
  existingRecord,
  employeeId,
  initialDate,
}: MarkAttendanceModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Success dialogs use the *global* (root) alert, shown only AFTER this feature
  // modal has fully dismissed (see finishWithSuccess). Overlapping two RN modals
  // in the same frame hangs iOS. Errors/confirmations, which keep this modal
  // open, use the local in-modal alert below instead.
  const { success: showGlobalSuccess } = useAlert();

  // Local alert state.
  //
  // We deliberately do NOT use the global `useAlert()` here: that AlertModal is
  // mounted once at the app root, and on iOS a root-level <Modal> cannot present
  // on top of this feature <Modal> — it renders behind it (or not at all), so
  // the delete-confirmation and success/error dialogs were invisible on iPhone,
  // which made "mark" and "delete" appear to do nothing. Rendering our own
  // AlertModal *inside* this Modal presents it on top correctly on iOS.
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type: AlertType;
    buttons: AlertButton[];
  }>({ visible: false, title: "", type: "info", buttons: [] });

  const hideAlert = () => setAlertState((prev) => ({ ...prev, visible: false }));

  const error = (title: string, message?: string, onOk?: () => void) =>
    setAlertState({
      visible: true,
      title,
      message,
      type: "error",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });

  const info = (title: string, message?: string, onOk?: () => void) =>
    setAlertState({
      visible: true,
      title,
      message,
      type: "info",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });

  const confirmDestructive = (
    title: string,
    message: string,
    onConfirm: () => void
  ) =>
    setAlertState({
      visible: true,
      title,
      message,
      type: "error",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ],
    });

  const { data: employees } = useAllUsers({
    role: "employee",
    organizationId: user?.organization_id || "",
  });
  const queryClient = useQueryClient();

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    userId: "",
    date: initialDate || getTodayDate(),
    checkInTime: "",
    checkOutTime: "",
    checkOutDate: initialDate || getTodayDate(), // Separate date for check-out
    useSeparateCheckOutDate: false, // Toggle for different check-out date
    notes: "",
    overtimeHours: "",
    overtimeReason: "",
  });
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [originalRecordId, setOriginalRecordId] = useState<string>("");

  // Track if we've initialized from the existingRecord prop
  // This prevents the prefill effect from overwriting initial data
  const hasInitializedFromProp = useRef(false);

  // Tracks the (employee|date) combo we've already prefilled from the fetched
  // record. The prefill effect runs again on every background refetch; without
  // this guard it would re-apply the stored record time and clobber a time HR
  // just picked — which is what made the field snap back to 05:30 (a
  // UTC-midnight record shown in IST) right after selecting a real time.
  const prefilledKeyRef = useRef<string>("");

  // Fetch break requests for existing record (including discovered records via date selection)
  const { data: breakRequests } = useBreakRequestsByAttendance(
    originalRecordId || existingRecord?.id || "",
    { enabled: !!(originalRecordId || existingRecord?.id) }
  );

  // Fetch attendance for selected employee + date combination
  // Always fetch when userId and date are present - this allows date changes to trigger refetch
  const { data: existingAttendanceForDate, isFetching: isFetchingAttendance } = useAllAttendanceRecords(
    {
      userId: formData.userId,
      date: formData.date,
      organizationId: user?.organization_id || "",
    },
    {
      enabled: !!formData.userId && !!formData.date,
    }
  );

  // Reset and pre-fill form when modal opens or props change
  useEffect(() => {
    if (visible) {
      if (existingRecord) {
        // Track the original record we're editing
        setOriginalRecordId(existingRecord.id);
        hasInitializedFromProp.current = true;

        // Editing existing record
        const checkInDate = existingRecord.check_in_time
          ? new Date(existingRecord.check_in_time).toISOString().split("T")[0]
          : existingRecord.date;
        const checkOutDate = existingRecord.check_out_time
          ? new Date(existingRecord.check_out_time).toISOString().split("T")[0]
          : checkInDate;

        setFormData({
          userId: existingRecord.user_id,
          date: checkInDate,
          checkInTime: timeFromStoredTimestamp(existingRecord.check_in_time),
          checkOutTime: timeFromStoredTimestamp(existingRecord.check_out_time),
          checkOutDate: checkOutDate,
          useSeparateCheckOutDate: checkInDate !== checkOutDate,
          notes: existingRecord.notes || "",
          overtimeHours: existingRecord.overtime_hours
            ? String(existingRecord.overtime_hours)
            : "",
          overtimeReason: existingRecord.overtime_reason || "",
        });
      } else if (employeeId) {
        // Creating new record with pre-selected employee
        setOriginalRecordId("");
        hasInitializedFromProp.current = false;
        setFormData({
          userId: employeeId,
          date: initialDate || getTodayDate(),
          checkInTime: "",
          checkOutTime: "",
          checkOutDate: initialDate || getTodayDate(),
          useSeparateCheckOutDate: false,
          notes: "",
          overtimeHours: "",
          overtimeReason: "",
        });
      } else {
        // Creating new record without pre-selection
        setOriginalRecordId("");
        hasInitializedFromProp.current = false;
        resetForm();
      }
      setShowEmployeeDropdown(false);
      setSearchTerm("");
    }
  }, [visible, existingRecord, employeeId]);

  // Prefill form when attendance data is found for the selected date
  // This effect runs when date/user changes to dynamically discover existing records
  useEffect(() => {
    // Skip if we're still showing initial data from existingRecord prop
    // This prevents overwriting the initial record data on first render
    if (hasInitializedFromProp.current && existingRecord) return;

    // Skip if no user or date selected yet
    if (!formData.userId || !formData.date) return;

    // Skip if data is still loading
    if (isFetchingAttendance) return;

    // Only prefill ONCE per (employee, date). Later background refetches re-run
    // this effect; without this guard they'd re-apply the fetched record and
    // overwrite a time HR has since picked (the "reverts to 05:30" bug).
    const key = `${formData.userId}|${formData.date}`;
    if (prefilledKeyRef.current === key) return;
    prefilledKeyRef.current = key;

    // Check if we have attendance data for this combination
    if (existingAttendanceForDate && existingAttendanceForDate.length > 0) {
      // DATA FOUND - Prefill with fetched data
      const record = existingAttendanceForDate[0];

      const checkInDate = record.check_in_time
        ? new Date(record.check_in_time).toISOString().split("T")[0]
        : record.date;
      const checkOutDate = record.check_out_time
        ? new Date(record.check_out_time).toISOString().split("T")[0]
        : checkInDate;

      setFormData(prev => ({
        ...prev,  // Keep userId and date
        checkInTime: timeFromStoredTimestamp(record.check_in_time),
        checkOutTime: timeFromStoredTimestamp(record.check_out_time),
        checkOutDate: checkOutDate,
        useSeparateCheckOutDate: checkInDate !== checkOutDate,
        notes: record.notes || "",
        overtimeHours: record.overtime_hours ? String(record.overtime_hours) : "",
        overtimeReason: record.overtime_reason || "",
      }));

      // Update tracking to reflect we're now editing this record
      setOriginalRecordId(record.id);
    }
    // NO DATA FOUND: intentionally do nothing here. The employee/date change
    // handlers already reset the form for a fresh entry. Clearing on this async
    // query settle would wipe the times HR types in while the attendance fetch
    // for a newly-selected (e.g. previous) date is still in flight — which is
    // exactly why "marking time for a previous date" appeared broken.
  }, [formData.userId, formData.date, existingAttendanceForDate, isFetchingAttendance, existingRecord]);

  // Close this modal, then show the success dialog only AFTER it has fully
  // dismissed. The success alert is the root-level <Modal>; showing it while
  // this feature <Modal> is still dismissing puts two stacked RN modals through
  // a state change in the same frame, which hangs the UI on iOS. Deferring past
  // the dismiss animation guarantees only one modal is ever on screen.
  const finishWithSuccess = (message: string) => {
    onClose();
    resetForm();
    setTimeout(() => {
      showGlobalSuccess("Success", message);
    }, 450);
  };

  const markMutation = useMarkAttendance(user?.id || "", {
    onSuccess: async () => {
      finishWithSuccess("Attendance marked successfully");
    },
    onError: (err) => {
      error("Error", err.message || "Failed to mark attendance");
    },
  });

  // Pass the editor's (HR/admin) id so the hook notifies the *employee* being edited.
  const updateMutation = useUpdateAttendance(user?.id || "", {
    onSuccess: async () => {
      finishWithSuccess("Attendance updated successfully");
    },
    onError: (err) => {
      error("Error", err.message || "Failed to update attendance");
    },
  });

  const deleteMutation = useDeleteAttendance({
    onSuccess: async () => {
      finishWithSuccess("Attendance deleted successfully");
    },
    onError: (err) => {
      error("Error", err.message || "Failed to delete attendance");
    },
  });

  const resetForm = () => {
    setOriginalRecordId("");
    hasInitializedFromProp.current = false;
    setFormData({
      userId: "",
      date: initialDate || getTodayDate(),
      checkInTime: "",
      checkOutTime: "",
      checkOutDate: initialDate || getTodayDate(),
      useSeparateCheckOutDate: false,
      notes: "",
      overtimeHours: "",
      overtimeReason: "",
    });
    setSearchTerm("");
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.userId) {
      error("Error", "Please select an employee");
      return;
    }
    if (!formData.date) {
      error("Error", "Please enter date");
      return;
    }
    if (!formData.checkInTime) {
      error("Error", "Please enter check-in time");
      return;
    }

    // Validate check-out time is not in the future
    if (formData.checkOutTime) {
      const checkOutDateToUse = formData.useSeparateCheckOutDate
        ? formData.checkOutDate
        : formData.date;

      const [checkOutHour, checkOutMinute] = formData.checkOutTime
        .split(":")
        .map(Number);
      const checkOutDateTime = new Date(checkOutDateToUse);
      checkOutDateTime.setHours(checkOutHour, checkOutMinute, 0, 0);

      const now = new Date();

      if (checkOutDateTime > now) {
        error("Invalid Time", "Check-out time cannot be in the future");
        return;
      }
    }

    // Block attendance marking on off days
    if (!isSelectedDateWorkingDay) {
      info(
        "Cannot Mark Attendance",
        "The selected date is not a working day for this employee. Attendance cannot be marked on off days."
      );
      return;
    }

    // Check for negative duration
    if (hoursPreview !== null && hoursPreview.regularHours < 0) {
      error(
        "Invalid Time",
        "Check-out time cannot be before check-in time"
      );
      return;
    }

    // Prevent checkout if employee has ongoing or upcoming breaks
    if (formData.checkOutTime && existingRecord) {
      const now = new Date();
      const approvedBreaks =
        breakRequests?.filter((req) => req.status === "completed") || [];

      // Check for ongoing or upcoming breaks
      const activeOrUpcomingBreak = approvedBreaks.find((breakReq) => {
        const startTimeStr =
          breakReq.actual_start_time || breakReq.approved_start_time;
        const endTimeStr =
          breakReq.actual_end_time || breakReq.approved_end_time;
        if (!startTimeStr || !endTimeStr) return false;

        const startTime = new Date(startTimeStr);
        const endTime = new Date(endTimeStr);

        // Ongoing: current time is between start and end
        const isOngoing = now >= startTime && now <= endTime;

        // Upcoming: start time is in the future
        const isUpcoming = now < startTime;

        return isOngoing || isUpcoming;
      });

      if (activeOrUpcomingBreak) {
        const startTimeStr =
          activeOrUpcomingBreak.actual_start_time ||
          activeOrUpcomingBreak.approved_start_time!;
        const endTimeStr =
          activeOrUpcomingBreak.actual_end_time ||
          activeOrUpcomingBreak.approved_end_time!;
        const startTime = new Date(startTimeStr);
        const endTime = new Date(endTimeStr);
        const isOngoing = now >= startTime && now <= endTime;

        info(
          isOngoing ? "Break in Progress" : "Break Scheduled",
          isOngoing
            ? `This employee is currently on break (ends at ${endTime.toLocaleTimeString(
                "en-US",
                { hour: "2-digit", minute: "2-digit" }
              )}). Please wait until the break is complete before checking them out.`
            : `This employee has a scheduled break starting at ${startTime.toLocaleTimeString(
                "en-US",
                { hour: "2-digit", minute: "2-digit" }
              )}. Please complete or cancel the break before checking them out.`
        );
        return;
      }
    }

    proceedWithSubmit();
  };

  const proceedWithSubmit = () => {
    // Convert local time to UTC ISO format
    const [checkInHour, checkInMinute] = formData.checkInTime.split(":");
    const checkInDate = new Date(formData.date);
    checkInDate.setHours(parseInt(checkInHour), parseInt(checkInMinute), 0, 0);
    const checkInDateTime = checkInDate.toISOString();

    let checkOutDateTime: string | undefined;
    if (formData.checkOutTime) {
      const [checkOutHour, checkOutMinute] = formData.checkOutTime.split(":");
      // Use separate check-out date if enabled, otherwise use check-in date
      const checkOutDateToUse = formData.useSeparateCheckOutDate
        ? formData.checkOutDate
        : formData.date;
      const checkOutDate = new Date(checkOutDateToUse);
      checkOutDate.setHours(
        parseInt(checkOutHour),
        parseInt(checkOutMinute),
        0,
        0
      );
      checkOutDateTime = checkOutDate.toISOString();
    }

    // Parse overtime hours - default to 0 if empty
    const overtimeHours =
      formData.overtimeHours && formData.overtimeHours.trim() !== ""
        ? parseFloat(formData.overtimeHours)
        : 0;

    if (existingRecord) {
      // Update existing record
      updateMutation.mutate({
        recordId: existingRecord.id,
        updates: {
          check_in_time: checkInDateTime,
          check_out_time: checkOutDateTime,
          notes: formData.notes,
          overtime_hours: overtimeHours,
          overtime_reason:
            overtimeHours > 0
              ? formData.overtimeReason || undefined
              : undefined,
        },
      });
    } else {
      // Create new record
      markMutation.mutate({
        userId: formData.userId,
        date: formData.date,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        notes: formData.notes,
        overtimeHours: overtimeHours,
        overtimeReason:
          overtimeHours > 0 ? formData.overtimeReason || undefined : undefined,
      });
    }
  };

  const handleDelete = () => {
    if (!existingRecord) return;

    // Check for active or upcoming breaks before allowing deletion
    const now = new Date();
    const approvedBreaks =
      breakRequests?.filter((req) => req.status === "completed") || [];

    const activeOrUpcomingBreak = approvedBreaks.find((breakReq) => {
      const startTimeStr =
        breakReq.actual_start_time || breakReq.approved_start_time;
      const endTimeStr = breakReq.actual_end_time || breakReq.approved_end_time;
      if (!startTimeStr || !endTimeStr) return false;

      const startTime = new Date(startTimeStr);
      const endTime = new Date(endTimeStr);

      // Ongoing: current time is between start and end
      const isOngoing = now >= startTime && now <= endTime;

      // Upcoming: start time is in the future
      const isUpcoming = now < startTime;

      return isOngoing || isUpcoming;
    });

    if (activeOrUpcomingBreak) {
      const startTimeStr =
        activeOrUpcomingBreak.actual_start_time ||
        activeOrUpcomingBreak.approved_start_time!;
      const endTimeStr =
        activeOrUpcomingBreak.actual_end_time ||
        activeOrUpcomingBreak.approved_end_time!;
      const startTime = new Date(startTimeStr);
      const endTime = new Date(endTimeStr);
      const isOngoing = now >= startTime && now <= endTime;

      info(
        "Cannot Delete",
        isOngoing
          ? `This employee is currently on break (ends at ${endTime.toLocaleTimeString(
              "en-US",
              { hour: "2-digit", minute: "2-digit" }
            )}). Please wait until the break is complete before deleting attendance.`
          : `This employee has a scheduled break starting at ${startTime.toLocaleTimeString(
              "en-US",
              { hour: "2-digit", minute: "2-digit" }
            )}. Please complete or cancel the break before deleting attendance.`
      );
      return;
    }

    // Calculate hours info for confirmation message
    const hours = existingRecord.total_hours || 0;
    const employeeName = selectedEmployee?.full_name || "this employee";
    const recordDate = new Date(existingRecord.date).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );

    confirmDestructive(
      "Delete Attendance?",
      `Are you sure you want to delete attendance for ${employeeName} on ${recordDate}?\n\n` +
        `This will remove ${hours.toFixed(2)} hours from their record.\n\n` +
        `Monthly earnings will be automatically recalculated.`,
      () => {
        deleteMutation.mutate({ recordId: existingRecord.id });
      }
    );
  };

  const selectedEmployee = employees?.find((e) => e.id === formData.userId);
  const filteredEmployees = employees?.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if selected date is a working day
  const isSelectedDateWorkingDay = useMemo(() => {
    if (!selectedEmployee || !formData.date) return true;
    const workingDays = (selectedEmployee.working_days || []) as WeekDay[];
    const selectedDate = new Date(formData.date);
    return isWorkingDay(selectedDate, workingDays);
  }, [selectedEmployee, formData.date]);

  // Calculate hours preview
  const hoursPreview = useMemo(() => {
    if (!formData.checkInTime || !formData.checkOutTime) return null;

    const [checkInHour, checkInMinute] = formData.checkInTime
      .split(":")
      .map(Number);
    const [checkOutHour, checkOutMinute] = formData.checkOutTime
      .split(":")
      .map(Number);

    const checkInDate = new Date(formData.date);
    checkInDate.setHours(checkInHour, checkInMinute, 0, 0);

    // Use separate check-out date if enabled
    const checkOutDateToUse = formData.useSeparateCheckOutDate
      ? formData.checkOutDate
      : formData.date;
    const checkOutDate = new Date(checkOutDateToUse);
    checkOutDate.setHours(checkOutHour, checkOutMinute, 0, 0);

    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
    const grossHours = diffMs / (1000 * 60 * 60);

    // Calculate break hours from break requests
    const breakHours = breakRequests && breakRequests.length > 0
      ? calculateApprovedBreakHours(breakRequests)
      : 0;

    // Calculate net regular hours (subtract breaks)
    const netRegularHours = Math.max(0, grossHours - breakHours);

    // Add overtime hours to total
    const overtimeHours = formData.overtimeHours
      ? parseFloat(formData.overtimeHours)
      : 0;
    const totalHours = netRegularHours + overtimeHours;

    return { regularHours: netRegularHours, overtimeHours, totalHours };
  }, [
    formData.checkInTime,
    formData.checkOutTime,
    formData.date,
    formData.checkOutDate,
    formData.useSeparateCheckOutDate,
    formData.overtimeHours,
    breakRequests,
  ]);

  // Calculate break hours info (database handles the actual deduction)
  const breakHoursData = useMemo(() => {
    if (!breakRequests || breakRequests.length === 0) {
      return { hasBreaks: false, breakHours: 0 };
    }

    const breakHours = calculateApprovedBreakHours(breakRequests);

    return {
      hasBreaks: breakHours > 0,
      breakHours,
      breakSummary: formatBreakDurationFromRequests(breakRequests),
    };
  }, [breakRequests]);

  const isLoading =
    markMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {existingRecord ? "Edit Attendance" : "Mark Attendance"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={[
              styles.modalContentContainer,
              { paddingBottom: Math.max(insets.bottom + 40, 60) },
            ]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
          >
            {/* Employee Selection */}
            {!existingRecord && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Employee <Text style={styles.required}>*</Text>
                </Text>
                {employeeId ? (
                  // Read-only display when employee is pre-selected
                  <View
                    style={[
                      styles.dropdownButton,
                      styles.dropdownButtonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={20}
                      color={Colors.gray500}
                    />
                    <Text style={styles.dropdownButtonText}>
                      {selectedEmployee
                        ? `${selectedEmployee.full_name} (${selectedEmployee.employee_id})`
                        : "Loading..."}
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() =>
                        setShowEmployeeDropdown(!showEmployeeDropdown)
                      }
                    >
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={20}
                        color={Colors.gray500}
                      />
                      <Text
                        style={[
                          styles.dropdownButtonText,
                          !selectedEmployee && styles.dropdownPlaceholder,
                        ]}
                      >
                        {selectedEmployee
                          ? `${selectedEmployee.full_name} (${selectedEmployee.employee_id})`
                          : "Select employee"}
                      </Text>
                      <Ionicons
                        name={
                          showEmployeeDropdown ? "chevron-up" : "chevron-down"
                        }
                        size={20}
                        color={Colors.gray500}
                      />
                    </TouchableOpacity>

                    {showEmployeeDropdown && (
                      <View style={styles.dropdown}>
                        <View style={styles.searchBox}>
                          <Ionicons name="search" size={18} color={Colors.gray500} />
                          <TextInput
                            style={styles.searchInput}
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholderTextColor={Colors.textTertiary}
                          />
                        </View>
                        <ScrollView
                          style={styles.dropdownList}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          keyboardShouldPersistTaps="handled"
                        >
                          {filteredEmployees?.map((employee) => (
                            <TouchableOpacity
                              key={employee.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                // Reset the entry fields when switching employee so
                                // a late attendance refetch can't overwrite times
                                // entered for the newly-selected person.
                                setFormData((prev) => ({
                                  ...prev,
                                  userId: employee.id,
                                  checkInTime: "",
                                  checkOutTime: "",
                                  useSeparateCheckOutDate: false,
                                  notes: "",
                                  overtimeHours: "",
                                  overtimeReason: "",
                                }));
                                setOriginalRecordId("");
                                setShowEmployeeDropdown(false);
                                setSearchTerm("");
                              }}
                            >
                              <Text style={styles.dropdownItemName}>
                                {employee.full_name}
                              </Text>
                              <Text style={styles.dropdownItemId}>
                                {employee.employee_id}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Date */}
            <DatePicker
              value={formData.date}
              onChange={(date) => {
                // Reset the entry for the newly-selected date up-front. Doing the
                // reset here (rather than in the async prefill effect) means a
                // late attendance refetch can't wipe times HR enters for this date.
                setFormData((prev) => ({
                  ...prev,
                  date,
                  checkInTime: "",
                  checkOutTime: "",
                  checkOutDate: date,
                  useSeparateCheckOutDate: false,
                  notes: "",
                  overtimeHours: "",
                  overtimeReason: "",
                }));
                setOriginalRecordId("");
                // Reset the initialization flag to allow prefilling for the new date
                hasInitializedFromProp.current = false;
              }}
              label="Date"
              required
              maximumDate={new Date()}
            />

            {/* Loading indicator while fetching attendance data */}
            {isFetchingAttendance && formData.userId && formData.date && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={Colors.indigo} />
                <Text style={styles.loadingText}>Checking existing attendance...</Text>
              </View>
            )}

            {/* Check-in Time */}
            <TimePicker
              value={formData.checkInTime}
              onChange={(time) =>
                setFormData((prev) => ({ ...prev, checkInTime: time }))
              }
              label="Check-in Time"
              required
              iconName="log-in-outline"
              iconColor={Colors.success}
            />

            {/* Check-out Time */}
            <TimePicker
              value={formData.checkOutTime}
              onChange={(time) =>
                setFormData((prev) => ({ ...prev, checkOutTime: time }))
              }
              label="Check-out Time"
              iconName="log-out-outline"
              iconColor={Colors.error}
            />

            {/* Different Check-out Date Toggle */}
            {formData.checkOutTime && (
              <TouchableOpacity
                style={styles.checkOutDateToggle}
                onPress={() =>
                  setFormData({
                    ...formData,
                    useSeparateCheckOutDate: !formData.useSeparateCheckOutDate,
                    checkOutDate: formData.useSeparateCheckOutDate
                      ? formData.date
                      : formData.checkOutDate,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.toggleLeft}>
                  <MaterialCommunityIcons
                    name={
                      formData.useSeparateCheckOutDate
                        ? "checkbox-marked"
                        : "checkbox-blank-outline"
                    }
                    size={22}
                    color={
                      formData.useSeparateCheckOutDate ? Colors.indigo : Colors.textTertiary
                    }
                  />
                  <Text style={styles.toggleText}>
                    Different check-out date
                  </Text>
                </View>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>
            )}

            {/* Check-out Date (shown only if toggle is enabled) */}
            {formData.checkOutTime && formData.useSeparateCheckOutDate && (
              <DatePicker
                value={formData.checkOutDate}
                onChange={(date) =>
                  setFormData({ ...formData, checkOutDate: date })
                }
                label="Check-out Date"
                required
                maximumDate={new Date()}
              />
            )}

            {/* Break Information - Always show if there are approved breaks */}
            {breakHoursData.hasBreaks && (
              <View style={[styles.breakInfoCard, { marginBottom: 20 }]}>
                <MaterialCommunityIcons
                  name="coffee-outline"
                  size={20}
                  color={Colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLabel}>
                    Break Duration (will be deducted)
                  </Text>
                  <Text style={styles.breakValue}>
                    {breakHoursData.breakSummary}
                  </Text>
                </View>
              </View>
            )}

            {/* Hours Preview */}
            {hoursPreview !== null && (
              <View style={styles.hoursBreakdownContainer}>
                <View
                  style={[
                    styles.previewCard,
                    hoursPreview.regularHours < 0
                      ? styles.previewCardError
                      : styles.previewCardSuccess,
                  ]}
                >
                  <Ionicons
                    name={
                      hoursPreview.regularHours < 0 ? "alert-circle" : "time"
                    }
                    size={20}
                    color={
                      hoursPreview.regularHours < 0 ? Colors.error : Colors.indigo
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewLabel}>Regular Hours</Text>
                    <Text
                      style={[
                        styles.previewValue,
                        hoursPreview.regularHours < 0 &&
                          styles.previewValueError,
                      ]}
                    >
                      {hoursPreview.regularHours < 0
                        ? "Invalid time range"
                        : formatHours(hoursPreview.regularHours)}
                    </Text>
                  </View>
                </View>

                {/* Overtime Hours Display */}
                {hoursPreview.overtimeHours > 0 && (
                  <View style={styles.overtimeInfoCard}>
                    <MaterialCommunityIcons
                      name="clock-plus-outline"
                      size={20}
                      color={Colors.purple}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewLabel}>Overtime Hours</Text>
                      <Text style={styles.overtimeValue}>
                        +{formatHours(hoursPreview.overtimeHours)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Total Hours Display */}
                {hoursPreview.regularHours > 0 && (
                  <View style={styles.totalHoursCard}>
                    <MaterialCommunityIcons
                      name="sigma"
                      size={20}
                      color={Colors.success}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewLabel}>
                        Total Hours (inc. overtime)
                      </Text>
                      <Text style={styles.totalValue}>
                        {formatHours(hoursPreview.totalHours)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Overtime Section */}
            <View style={styles.overtimeSection}>
              <View style={styles.overtimeSectionHeader}>
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={20}
                  color={Colors.purple}
                />
                <Text style={styles.overtimeSectionTitle}>Overtime</Text>
              </View>

              {/* Overtime Hours Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Overtime Hours</Text>
                  <Text style={styles.labelHint}>(Max: 10 hrs)</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={Colors.gray500}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.overtimeHours}
                    onChangeText={(text) => {
                      // Allow only numbers and one decimal point
                      if (text === "" || /^\d*\.?\d*$/.test(text)) {
                        // Validate max 10 hours
                        const value = parseFloat(text);
                        if (text !== "" && value > 10) {
                          error(
                            "Invalid Overtime",
                            "Overtime hours cannot exceed 10 hours"
                          );
                          return;
                        }
                        setFormData({ ...formData, overtimeHours: text });
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <Text style={styles.inputSuffix}>hrs</Text>
                </View>
              </View>

              {/* Overtime Reason Input */}
              {formData.overtimeHours &&
                parseFloat(formData.overtimeHours) > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Overtime Reason</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons
                        name="text"
                        size={20}
                        color={Colors.gray500}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Project deadline, Extra work"
                        value={formData.overtimeReason}
                        onChangeText={(text) =>
                          setFormData({ ...formData, overtimeReason: text })
                        }
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  </View>
                )}
            </View>

            {/* Working Days Info & Warning */}
            {selectedEmployee && (
              <View style={styles.workingDaysInfo}>
                <View style={styles.workingDaysHeader}>
                  <MaterialCommunityIcons
                    name="calendar-week"
                    size={16}
                    color={Colors.gray500}
                  />
                  <Text style={styles.workingDaysLabel}>Working Days:</Text>
                </View>
                <View style={styles.workingDaysList}>
                  {selectedEmployee.working_days?.map((day) => (
                    <View key={day} style={styles.workingDayChip}>
                      <Text style={styles.workingDayText}>
                        {getWeekdayShortName(day as WeekDay)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Off Day Error */}
            {!isSelectedDateWorkingDay && selectedEmployee && (
              <View style={styles.errorCard}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>
                    Off Day - Cannot Mark Attendance
                  </Text>
                  <Text style={styles.errorText}>
                    This is not a working day for this employee. Please select a
                    valid working day.
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <MaterialCommunityIcons
                  name="note-text-outline"
                  size={20}
                  color={Colors.gray500}
                  style={styles.textAreaIcon}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isLoading || !isSelectedDateWorkingDay) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !isSelectedDateWorkingDay}
              activeOpacity={0.8}
            >
              {isLoading &&
              (markMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name={existingRecord ? "checkmark-circle" : "add-circle"}
                    size={20}
                    color={Colors.textInverse}
                  />
                  <Text style={styles.submitButtonText}>
                    {existingRecord ? "Update Attendance" : "Mark Attendance"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete Button - Only show when editing existing record */}
            {existingRecord && !existingRecord.id.startsWith("absent-") && (
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  isLoading && styles.deleteButtonDisabled,
                ]}
                onPress={handleDelete}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading && deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={Colors.textInverse} />
                    <Text style={styles.deleteButtonText}>
                      Delete Attendance
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* Local alert — rendered inside this Modal so it presents on top of the
          feature modal on iOS (a root-level alert Modal renders behind it). */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius["3xl"],
    borderTopRightRadius: BorderRadius["3xl"],
    height: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: Spacing["2xl"],
  },
  inputGroup: {
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
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  dropdownButton: {
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
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    color: Colors.textTertiary,
  },
  dropdownButtonDisabled: {
    backgroundColor: Colors.gray100,
    opacity: 0.7,
  },
  dropdown: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    ...Shadows.lg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  dropdownItemId: {
    fontSize: 13,
    color: Colors.gray500,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.indigo,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Colors.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Colors.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  previewCardSuccess: {
    backgroundColor: Colors.indigoLight,
    borderWidth: 1,
    borderColor: StatusColors.info.border,
  },
  previewCardError: {
    backgroundColor: StatusColors.rejected.background,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray500,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.indigo,
  },
  previewValueError: {
    color: Colors.error,
  },
  hoursBreakdownContainer: {
    marginBottom: 20,
    gap: 12,
  },
  breakInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: StatusColors.pending.background,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  breakValue: {
    fontSize: 16,
    fontWeight: "700",
    color: StatusColors.pending.text,
  },
  workingDaysInfo: {
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  workingDaysHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm + 2,
  },
  workingDaysLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.gray500,
  },
  workingDaysList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs + 2,
  },
  workingDayChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workingDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: StatusColors.pending.background,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
    marginBottom: Spacing.xl,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: StatusColors.pending.text,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: StatusColors.pending.text,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: StatusColors.rejected.background,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: StatusColors.rejected.text,
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: StatusColors.rejected.text,
  },
  checkOutDateToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md + 2,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  overtimeSection: {
    backgroundColor: Colors.purpleLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
  },
  overtimeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  overtimeSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: StatusColors.overtime.text,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray500,
    marginLeft: Spacing.sm,
  },
  overtimeInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.purpleLight,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.md + 2,
    borderWidth: 1,
    borderColor: StatusColors.overtime.border,
    marginTop: Spacing.sm,
  },
  overtimeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.purple,
  },
  totalHoursCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: StatusColors.approved.background,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.md + 2,
    borderWidth: 1,
    borderColor: StatusColors.approved.border,
    marginTop: Spacing.sm,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.success,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
  },
  labelHint: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.purple,
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.indigoLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md + 2,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: StatusColors.info.border,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.indigo,
  },
});
