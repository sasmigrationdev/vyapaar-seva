import TimePicker from "@/components/ui/TimePicker";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useHRAddManualBreak,
  useHRUpdateBreak,
} from "@/hooks/mutations/useBreakRequestMutations";
import { useBreakRequestsByAttendance } from "@/hooks/queries/useBreakRequests";
import { AttendanceWithUser, BreakRequest } from "@/lib/types";
import { calculateBreakDuration } from "@/lib/utils/attendance.utils";
import { formatDate, formatTime } from "@/lib/utils/date.utils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import { FontFamily } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AssignBreakModalProps {
  visible: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceWithUser;
}

export default function AssignBreakModal({
  visible,
  onClose,
  attendanceRecord,
}: AssignBreakModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { success, error } = useAlert();
  const [breakStartTime, setBreakStartTime] = useState("");
  const [breakEndTime, setBreakEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [showPastBreaks, setShowPastBreaks] = useState(false);

  // Fetch existing breaks for this attendance record
  const {
    data: existingBreaks = [],
    isLoading: isLoadingBreaks,
    refetch: refetchBreaks,
  } = useBreakRequestsByAttendance(attendanceRecord.id);

  // Filter to get completed breaks only (HR manually assigned breaks)
  // Use fallback logic: check actual_* first, then approved_* for backward compatibility
  const scheduledBreaks = existingBreaks.filter(
    (br) =>
      br.status === "completed" &&
      ((br.actual_start_time && br.actual_end_time) || (br.approved_start_time && br.approved_end_time))
  );

  // Separate upcoming and past breaks
  const now = new Date();
  const upcomingBreaks = scheduledBreaks.filter((br) => {
    const endTimeStr = br.actual_end_time || br.approved_end_time;
    if (!endTimeStr) return false;
    const endTime = new Date(endTimeStr);
    return endTime > now; // Break hasn't ended yet (ongoing or upcoming)
  });

  const pastBreaks = scheduledBreaks.filter((br) => {
    const endTimeStr = br.actual_end_time || br.approved_end_time;
    if (!endTimeStr) return false;
    const endTime = new Date(endTimeStr);
    return endTime <= now; // Break has ended
  });

  const assignBreakMutation = useHRAddManualBreak(user?.id || "", {
    onSuccess: () => {
      success("Success", "Break assigned successfully to employee");
      onClose();
    },
    onError: (err) => {
      error("Error", err.message || "Failed to assign break");
    },
  });

  const updateBreakMutation = useHRUpdateBreak(user?.id || "", {
    onSuccess: () => {
      success("Success", "Break updated successfully");
      onClose();
    },
    onError: (err) => {
      error("Error", err.message || "Failed to update break");
    },
  });

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setBreakStartTime("");
      setBreakEndTime("");
      setNotes("");
      setEditingBreakId(null);
      // Refetch breaks to ensure we have the latest data
      refetchBreaks();
    }
  }, [visible, refetchBreaks]);

  const calculateDuration = (): number | null => {
    if (!breakStartTime || !breakEndTime) return null;

    const [startHour, startMinute] = breakStartTime.split(":").map(Number);
    const [endHour, endMinute] = breakEndTime.split(":").map(Number);

    const startDate = new Date(attendanceRecord.date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(attendanceRecord.date);
    endDate.setHours(endHour, endMinute, 0, 0);

    // If end time is before start time, assume it's the next day
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return calculateBreakDuration(
      startDate.toISOString(),
      endDate.toISOString()
    );
  };

  const duration = calculateDuration();

  // Check for time conflicts with existing breaks
  const checkTimeConflict = (
    startTime: Date,
    endTime: Date
  ): BreakRequest | null => {
    // Exclude the break being edited from conflict check
    const breaksToCheck = scheduledBreaks.filter(
      (br) => br.id !== editingBreakId
    );

    for (const existingBreak of breaksToCheck) {
      const startTimeStr = existingBreak.actual_start_time || existingBreak.approved_start_time;
      const endTimeStr = existingBreak.actual_end_time || existingBreak.approved_end_time;

      if (!startTimeStr || !endTimeStr) continue;

      const existingStart = new Date(startTimeStr);
      const existingEnd = new Date(endTimeStr);

      // Check if there's any overlap
      // Overlap occurs if: new start is before existing end AND new end is after existing start
      if (startTime < existingEnd && endTime > existingStart) {
        return existingBreak;
      }
    }

    return null;
  };

  const handleEditBreak = (breakRequest: BreakRequest) => {
    setEditingBreakId(breakRequest.id);

    // Set the form with existing break times (with fallback)
    const startTimeStr = breakRequest.actual_start_time || breakRequest.approved_start_time;
    const endTimeStr = breakRequest.actual_end_time || breakRequest.approved_end_time;

    if (!startTimeStr || !endTimeStr) return;

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    const startTimeFormatted = `${String(startTime.getHours()).padStart(
      2,
      "0"
    )}:${String(startTime.getMinutes()).padStart(2, "0")}`;
    const endTimeFormatted = `${String(endTime.getHours()).padStart(2, "0")}:${String(
      endTime.getMinutes()
    ).padStart(2, "0")}`;

    setBreakStartTime(startTimeFormatted);
    setBreakEndTime(endTimeFormatted);
    setNotes(breakRequest.notes || "");
  };

  const handleAssign = () => {
    if (!breakStartTime) {
      error("Required", "Please enter break start time");
      return;
    }

    if (!breakEndTime) {
      error("Required", "Please enter break end time");
      return;
    }

    if (duration === null || duration <= 0) {
      error("Invalid Time", "End time must be after start time");
      return;
    }

    // Create ISO timestamps
    const [startHour, startMinute] = breakStartTime.split(":").map(Number);
    const [endHour, endMinute] = breakEndTime.split(":").map(Number);

    const startDate = new Date(attendanceRecord.date);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(attendanceRecord.date);
    endDate.setHours(endHour, endMinute, 0, 0);

    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    // Validate against check-in time
    if (attendanceRecord.check_in_time) {
      const checkIn = new Date(attendanceRecord.check_in_time);
      if (startDate < checkIn) {
        error("Invalid Time", "Break cannot start before check-in time");
        return;
      }
    }

    // Validate against check-out time if available
    if (attendanceRecord.check_out_time) {
      const checkOut = new Date(attendanceRecord.check_out_time);
      if (endDate > checkOut) {
        error("Invalid Time", "Break cannot end after check-out time");
        return;
      }
    }

    // Check for time conflicts with existing breaks
    const conflict = checkTimeConflict(startDate, endDate);
    if (conflict) {
      const conflictStartStr = conflict.actual_start_time || conflict.approved_start_time;
      const conflictEndStr = conflict.actual_end_time || conflict.approved_end_time;

      if (conflictStartStr && conflictEndStr) {
        const conflictStart = new Date(conflictStartStr);
        const conflictEnd = new Date(conflictEndStr);
        error(
          "Time Conflict",
          `This break overlaps with an existing break scheduled from ${formatTime(
            conflictStart
          )} to ${formatTime(
            conflictEnd
          )}.\n\nPlease choose a different time or edit the existing break.`
        );
      } else {
        error("Time Conflict", "This break overlaps with an existing break.");
      }
      return;
    }

    // If editing, use update mutation; otherwise, use assign mutation
    if (editingBreakId) {
      updateBreakMutation.mutate({
        breakRequestId: editingBreakId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        notes: notes.trim() || undefined,
      });
    } else {
      assignBreakMutation.mutate({
        userId: attendanceRecord.user_id,
        attendanceRecordId: attendanceRecord.id,
        requestDate: attendanceRecord.date,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        notes: notes.trim() || undefined,
      });
    }
  };

  const hours = duration ? Math.floor(duration / 60) : 0;
  const minutes = duration ? duration % 60 : 0;

  const canAssignBreak = !!attendanceRecord.check_in_time;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons
                  name="coffee"
                  size={20}
                  color="#F59E0B"
                />
              </View>
              <Text style={styles.modalTitle}>Assign Break</Text>
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
            {!canAssignBreak ? (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Check-in Required</Text>
                  <Text style={styles.warningText}>
                    Employee must check in before you can assign a break.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Employee Info */}
                <View style={[styles.infoCard, { marginBottom: 20 }]}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="person" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Employee</Text>
                      <Text style={styles.infoValue}>
                        {attendanceRecord.user?.full_name || "Unknown"}
                      </Text>
                      <Text style={styles.infoSubtext}>
                        ID: {attendanceRecord.user?.employee_id || "N/A"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#6366F1"
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(new Date(attendanceRecord.date))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time-outline" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Work Hours</Text>
                      <Text style={styles.infoValue}>
                        {formatTime(new Date(attendanceRecord.check_in_time))} -{" "}
                        {attendanceRecord.check_out_time
                          ? formatTime(
                              new Date(attendanceRecord.check_out_time)
                            )
                          : "Not checked out"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Info Message */}
                <View style={[styles.infoMessageCard, { marginBottom: 20 }]}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#6366F1"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoMessageTitle}>Assigning Break</Text>
                    <Text style={styles.infoMessageText}>
                      This break will be automatically approved and added to the
                      employee's attendance record.
                    </Text>
                  </View>
                </View>

                {/* Existing Breaks Section */}
                {isLoadingBreaks ? (
                  <View
                    style={[styles.existingBreaksSection, { marginBottom: 20 }]}
                  >
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading breaks...</Text>
                  </View>
                ) : scheduledBreaks.length > 0 ? (
                  <View style={{ marginBottom: 20 }}>
                    {/* Upcoming Breaks - Always Visible */}
                    {upcomingBreaks.length > 0 && (
                      <View
                        style={[
                          styles.existingBreaksSection,
                          { marginBottom: pastBreaks.length > 0 ? 12 : 0 },
                        ]}
                      >
                        <View style={styles.existingBreaksHeader}>
                          <MaterialCommunityIcons
                            name="coffee-outline"
                            size={18}
                            color="#10B981"
                          />
                          <Text style={styles.upcomingBreaksTitle}>
                            Upcoming Breaks ({upcomingBreaks.length})
                          </Text>
                        </View>

                        <View style={styles.breaksList}>
                          {upcomingBreaks.map((breakReq, index) => {
                            const startTimeStr = breakReq.actual_start_time || breakReq.approved_start_time;
                            const endTimeStr = breakReq.actual_end_time || breakReq.approved_end_time;

                            if (!startTimeStr || !endTimeStr) return null;

                            const startTime = new Date(startTimeStr);
                            const endTime = new Date(endTimeStr);
                            const breakDuration = calculateBreakDuration(
                              startTimeStr,
                              endTimeStr
                            );
                            const breakHours = Math.floor(breakDuration / 60);
                            const breakMinutes = breakDuration % 60;
                            const isEditing = editingBreakId === breakReq.id;
                            const isOngoing =
                              now >= startTime && now <= endTime;

                            return (
                              <View
                                key={breakReq.id}
                                style={[
                                  styles.breakCard,
                                  isEditing && styles.breakCardEditing,
                                  isOngoing && styles.breakCardOngoing,
                                ]}
                              >
                                <View style={styles.breakCardContent}>
                                  <View style={styles.breakCardLeft}>
                                    <View
                                      style={[
                                        styles.breakNumberBadge,
                                        isOngoing &&
                                          styles.breakNumberBadgeOngoing,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.breakNumberText,
                                          isOngoing &&
                                            styles.breakNumberTextOngoing,
                                        ]}
                                      >
                                        {index + 1}
                                      </Text>
                                    </View>
                                    <View style={styles.breakCardInfo}>
                                      <View
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                      >
                                        <Text style={styles.breakCardTime}>
                                          {formatTime(startTime)} -{" "}
                                          {formatTime(endTime)}
                                        </Text>
                                        {isOngoing && (
                                          <View style={styles.ongoingBadge}>
                                            <Text
                                              style={styles.ongoingBadgeText}
                                            >
                                              Ongoing
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                      <View style={styles.breakCardMeta}>
                                        <Ionicons
                                          name="timer-outline"
                                          size={12}
                                          color="#64748B"
                                        />
                                        <Text style={styles.breakCardDuration}>
                                          {breakHours > 0 && `${breakHours}h `}
                                          {breakMinutes}m
                                        </Text>
                                      </View>
                                      {breakReq.notes && (
                                        <Text
                                          style={styles.breakCardNotes}
                                          numberOfLines={1}
                                        >
                                          {breakReq.notes}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                  <TouchableOpacity
                                    style={[
                                      styles.editBreakButton,
                                      isEditing && styles.editBreakButtonActive,
                                    ]}
                                    onPress={() => handleEditBreak(breakReq)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name={
                                        isEditing
                                          ? "checkmark"
                                          : "create-outline"
                                      }
                                      size={18}
                                      color={isEditing ? "#FFFFFF" : "#6366F1"}
                                    />
                                  </TouchableOpacity>
                                </View>
                                {isEditing && (
                                  <View style={styles.editingIndicator}>
                                    <Ionicons
                                      name="pencil"
                                      size={12}
                                      color="#6366F1"
                                    />
                                    <Text style={styles.editingIndicatorText}>
                                      Editing this break below
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Past Breaks - Collapsible */}
                    {pastBreaks.length > 0 && (
                      <View style={styles.pastBreaksSection}>
                        <TouchableOpacity
                          style={styles.pastBreaksHeader}
                          onPress={() => setShowPastBreaks(!showPastBreaks)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <MaterialCommunityIcons
                              name="history"
                              size={18}
                              color="#64748B"
                            />
                            <Text style={styles.pastBreaksTitle}>
                              Past Breaks ({pastBreaks.length})
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              showPastBreaks ? "chevron-up" : "chevron-down"
                            }
                            size={20}
                            color="#64748B"
                          />
                        </TouchableOpacity>

                        {showPastBreaks && (
                          <View style={styles.breaksList}>
                            {pastBreaks.map((breakReq, index) => {
                              const startTimeStr = breakReq.actual_start_time || breakReq.approved_start_time;
                              const endTimeStr = breakReq.actual_end_time || breakReq.approved_end_time;

                              if (!startTimeStr || !endTimeStr) return null;

                              const startTime = new Date(startTimeStr);
                              const endTime = new Date(endTimeStr);
                              const breakDuration = calculateBreakDuration(
                                startTimeStr,
                                endTimeStr
                              );
                              const breakHours = Math.floor(breakDuration / 60);
                              const breakMinutes = breakDuration % 60;
                              const isEditing = editingBreakId === breakReq.id;

                              return (
                                <View
                                  key={breakReq.id}
                                  style={[
                                    styles.breakCard,
                                    styles.breakCardPast,
                                    isEditing && styles.breakCardEditing,
                                  ]}
                                >
                                  <View style={styles.breakCardContent}>
                                    <View style={styles.breakCardLeft}>
                                      <View
                                        style={[
                                          styles.breakNumberBadge,
                                          styles.breakNumberBadgePast,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.breakNumberText,
                                            styles.breakNumberTextPast,
                                          ]}
                                        >
                                          {index + 1}
                                        </Text>
                                      </View>
                                      <View style={styles.breakCardInfo}>
                                        <Text
                                          style={[
                                            styles.breakCardTime,
                                            styles.breakCardTimePast,
                                          ]}
                                        >
                                          {formatTime(startTime)} -{" "}
                                          {formatTime(endTime)}
                                        </Text>
                                        <View style={styles.breakCardMeta}>
                                          <Ionicons
                                            name="timer-outline"
                                            size={12}
                                            color="#94A3B8"
                                          />
                                          <Text
                                            style={[
                                              styles.breakCardDuration,
                                              styles.breakCardDurationPast,
                                            ]}
                                          >
                                            {breakHours > 0 &&
                                              `${breakHours}h `}
                                            {breakMinutes}m
                                          </Text>
                                        </View>
                                        {breakReq.notes && (
                                          <Text
                                            style={styles.breakCardNotes}
                                            numberOfLines={1}
                                          >
                                            {breakReq.notes}
                                          </Text>
                                        )}
                                      </View>
                                    </View>
                                    <View
                                      style={[
                                        styles.editBreakButton,
                                        styles.editBreakButtonDisabled,
                                      ]}
                                    >
                                      <Ionicons
                                        name="checkmark-done"
                                        size={18}
                                        color="#94A3B8"
                                      />
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Break Times */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {editingBreakId ? "Edit Break Schedule" : "Add New Break"}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  {editingBreakId && (
                    <TouchableOpacity
                      style={styles.cancelEditButton}
                      onPress={() => {
                        setEditingBreakId(null);
                        setBreakStartTime("");
                        setBreakEndTime("");
                        setNotes("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={styles.cancelEditText}>Cancel Edit</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ marginBottom: 12 }}>
                    <TimePicker
                      value={breakStartTime}
                      onChange={setBreakStartTime}
                      label="Break Start Time"
                      required
                      iconName="play-circle-outline"
                      iconColor="#10B981"
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <TimePicker
                      value={breakEndTime}
                      onChange={setBreakEndTime}
                      label="Break End Time"
                      required
                      iconName="stop-circle-outline"
                      iconColor="#EF4444"
                    />
                  </View>

                  {/* Duration Preview */}
                  {duration !== null && duration > 0 && (
                    <View
                      style={[styles.durationPreview, { marginBottom: 12 }]}
                    >
                      <Ionicons
                        name="timer-outline"
                        size={18}
                        color="#6366F1"
                      />
                      <Text style={styles.durationLabel}>Duration:</Text>
                      <Text style={styles.durationValue}>
                        {hours > 0 && `${hours}h `}
                        {minutes}m
                      </Text>
                    </View>
                  )}

                  {/* Notes */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <MaterialCommunityIcons
                        name="note-text-outline"
                        size={18}
                        color="#64748B"
                        style={styles.textAreaIcon}
                      />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add notes about this break (e.g., Lunch, Doctor appointment)..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          {canAssignBreak && (
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
                  styles.assignFooterButton,
                  (!breakStartTime ||
                    !breakEndTime ||
                    assignBreakMutation.isPending ||
                    updateBreakMutation.isPending) &&
                    styles.assignFooterButtonDisabled,
                ]}
                onPress={handleAssign}
                disabled={
                  !breakStartTime ||
                  !breakEndTime ||
                  assignBreakMutation.isPending ||
                  updateBreakMutation.isPending
                }
                activeOpacity={0.8}
              >
                {assignBreakMutation.isPending ||
                updateBreakMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.assignFooterButtonText}>
                      {editingBreakId ? "Update Break" : "Assign Break"}
                    </Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
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
    padding: 20,
    paddingBottom: 20,
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
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
    color: "#94A3B8",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  infoMessageCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EEF2FF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  infoMessageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
    marginBottom: 4,
  },
  infoMessageText: {
    fontSize: 13,
    color: "#4F46E5",
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  required: {
    color: "#EF4444",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
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
  durationPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  durationValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6366F1",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelFooterButton: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelFooterButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  assignFooterButton: {
    backgroundColor: "#F59E0B",
    ...Platform.select({
      ios: {
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  assignFooterButtonDisabled: {
    opacity: 0.5,
  },
  assignFooterButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  existingBreaksSection: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  existingBreaksHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  existingBreaksTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  upcomingBreaksTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#047857",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 8,
  },
  breaksList: {
    gap: 10,
  },
  breakCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breakCardEditing: {
    borderColor: "#6366F1",
    borderWidth: 2,
    backgroundColor: "#EEF2FF",
  },
  breakCardOngoing: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#D1FAE5",
  },
  breakCardPast: {
    backgroundColor: "#F8FAFC",
    opacity: 0.8,
  },
  breakCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  breakNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  breakNumberBadgeOngoing: {
    backgroundColor: "#A7F3D0",
  },
  breakNumberBadgePast: {
    backgroundColor: "#E2E8F0",
  },
  breakNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  breakNumberTextOngoing: {
    color: "#065F46",
  },
  breakNumberTextPast: {
    color: "#64748B",
  },
  breakCardInfo: {
    flex: 1,
    gap: 4,
  },
  breakCardTime: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakCardTimePast: {
    color: "#64748B",
  },
  breakCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breakCardDuration: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  breakCardDurationPast: {
    color: "#94A3B8",
  },
  ongoingBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ongoingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakCardNotes: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  editBreakButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  editBreakButtonActive: {
    backgroundColor: "#6366F1",
  },
  editBreakButtonDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.6,
  },
  editingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#C7D2FE",
  },
  editingIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
  },
  cancelEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  pastBreaksSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pastBreaksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pastBreaksTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
});
