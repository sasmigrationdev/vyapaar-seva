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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  const { success, error, info, confirmDestructive } = useAlert();
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
          checkInTime: existingRecord.check_in_time
            ? new Date(existingRecord.check_in_time).toTimeString().slice(0, 5)
            : "",
          checkOutTime: existingRecord.check_out_time
            ? new Date(existingRecord.check_out_time).toTimeString().slice(0, 5)
            : "",
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
        checkInTime: record.check_in_time
          ? new Date(record.check_in_time).toTimeString().slice(0, 5)
          : "",
        checkOutTime: record.check_out_time
          ? new Date(record.check_out_time).toTimeString().slice(0, 5)
          : "",
        checkOutDate: checkOutDate,
        useSeparateCheckOutDate: checkInDate !== checkOutDate,
        notes: record.notes || "",
        overtimeHours: record.overtime_hours ? String(record.overtime_hours) : "",
        overtimeReason: record.overtime_reason || "",
      }));

      // Update tracking to reflect we're now editing this record
      setOriginalRecordId(record.id);
    } else {
      // NO DATA FOUND - Clear fields for new attendance entry
      setFormData(prev => ({
        ...prev,  // Keep userId and date
        checkInTime: "",
        checkOutTime: "",
        checkOutDate: prev.date,
        useSeparateCheckOutDate: false,
        notes: "",
        overtimeHours: "",
        overtimeReason: "",
      }));

      // Clear the original record ID since we're creating new attendance
      setOriginalRecordId("");
    }
  }, [formData.userId, formData.date, existingAttendanceForDate, isFetchingAttendance, existingRecord]);

  const markMutation = useMarkAttendance(user?.id || "", {
    onSuccess: async () => {
      // The mutation hook handles cache invalidation automatically
      success("Success", "Attendance marked successfully");
      onClose();
      resetForm();
    },
    onError: (err) => {
      error("Error", err.message || "Failed to mark attendance");
    },
  });

  const updateMutation = useUpdateAttendance(formData.userId, {
    onSuccess: async () => {
      // The mutation hook handles cache invalidation automatically
      success("Success", "Attendance updated successfully");
      onClose();
      resetForm();
    },
    onError: (err) => {
      error("Error", err.message || "Failed to update attendance");
    },
  });

  const deleteMutation = useDeleteAttendance({
    onSuccess: async () => {
      // The mutation hook handles cache invalidation automatically
      success("Success", "Attendance deleted successfully");
      onClose();
      resetForm();
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
              <Ionicons name="close" size={24} color="#64748B" />
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
                      color="#64748B"
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
                        color="#64748B"
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
                        color="#64748B"
                      />
                    </TouchableOpacity>

                    {showEmployeeDropdown && (
                      <View style={styles.dropdown}>
                        <View style={styles.searchBox}>
                          <Ionicons name="search" size={18} color="#64748B" />
                          <TextInput
                            style={styles.searchInput}
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholderTextColor="#94A3B8"
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
                                setFormData({
                                  ...formData,
                                  userId: employee.id,
                                });
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
                setFormData({ ...formData, date });
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
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.loadingText}>Checking existing attendance...</Text>
              </View>
            )}

            {/* Check-in Time */}
            <TimePicker
              value={formData.checkInTime}
              onChange={(time) =>
                setFormData({ ...formData, checkInTime: time })
              }
              label="Check-in Time"
              required
              iconName="log-in-outline"
              iconColor="#10B981"
            />

            {/* Check-out Time */}
            <TimePicker
              value={formData.checkOutTime}
              onChange={(time) =>
                setFormData({ ...formData, checkOutTime: time })
              }
              label="Check-out Time"
              iconName="log-out-outline"
              iconColor="#EF4444"
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
                      formData.useSeparateCheckOutDate ? "#6366F1" : "#94A3B8"
                    }
                  />
                  <Text style={styles.toggleText}>
                    Different check-out date
                  </Text>
                </View>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#94A3B8"
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
                  color="#F59E0B"
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
                      hoursPreview.regularHours < 0 ? "#EF4444" : "#6366F1"
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
                      color="#8B5CF6"
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
                      color="#10B981"
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
                  color="#8B5CF6"
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
                    color="#64748B"
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
                    placeholderTextColor="#94A3B8"
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
                        color="#64748B"
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Project deadline, Extra work"
                        value={formData.overtimeReason}
                        onChangeText={(text) =>
                          setFormData({ ...formData, overtimeReason: text })
                        }
                        placeholderTextColor="#94A3B8"
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
                    color="#64748B"
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
                <Ionicons name="close-circle" size={20} color="#EF4444" />
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
                  color="#64748B"
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
                  placeholderTextColor="#94A3B8"
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={existingRecord ? "checkmark-circle" : "add-circle"}
                    size={20}
                    color="#FFFFFF"
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
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
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  dropdownPlaceholder: {
    color: "#94A3B8",
  },
  dropdownButtonDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.7,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  dropdownItemId: {
    fontSize: 13,
    color: "#64748B",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewCardSuccess: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  previewCardError: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
  },
  previewValueError: {
    color: "#EF4444",
  },
  hoursBreakdownContainer: {
    marginBottom: 20,
    gap: 12,
  },
  breakInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  breakValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
  },
  workingDaysInfo: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  workingDaysHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  workingDaysLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  workingDaysList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  workingDayChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  workingDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF3C7",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: "#78350F",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#991B1B",
  },
  checkOutDateToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  overtimeSection: {
    backgroundColor: "#FAF5FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  overtimeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  overtimeSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B21A8",
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 8,
  },
  overtimeInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAF5FF",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginTop: 8,
  },
  overtimeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  totalHoursCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 8,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  labelHint: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8B5CF6",
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6366F1",
  },
});
