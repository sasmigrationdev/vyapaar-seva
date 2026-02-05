/**
 * BreakRecordCard
 *
 * Individual break record card with employee info, status, and details
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatDate, formatTime } from "@/lib/utils/date.utils";

interface BreakRecordCardProps {
  id: string;
  employeeName: string;
  employeeId: string;
  status: string;
  requestDate: string;
  actualStartTime?: string;
  actualEndTime?: string;
  durationMinutes?: number;
  notes?: string;
  index: number;
  onRemove?: () => void;
}

export default function BreakRecordCard({
  id,
  employeeName,
  employeeId,
  status,
  requestDate,
  actualStartTime,
  actualEndTime,
  durationMinutes,
  notes,
  index,
  onRemove,
}: BreakRecordCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending_start":
        return { color: Colors.warning, label: "Pending", bgColor: Colors.warning + "15" };
      case "active":
        return { color: Colors.info, label: "Active", bgColor: Colors.info + "15" };
      case "completed":
        return { color: Colors.success, label: "Completed", bgColor: Colors.success + "15" };
      case "rejected":
        return { color: Colors.error, label: "Rejected", bgColor: Colors.error + "15" };
      case "cancelled":
        return { color: Colors.gray500, label: "Cancelled", bgColor: Colors.gray100 };
      default:
        return { color: Colors.gray500, label: status, bgColor: Colors.gray100 };
    }
  };

  const statusConfig = getStatusConfig(status);
  const hours = durationMinutes ? Math.floor(durationMinutes / 60) : 0;
  const minutes = durationMinutes ? Math.round(durationMinutes % 60) : 0;

  const initials = employeeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(50 + index * 30).springify()}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.employeeSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {employeeName}
              </Text>
              <Text style={styles.employeeIdText}>ID: {employeeId}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.detailText}>
              {formatDate(new Date(requestDate))}
            </Text>
          </View>

          {actualStartTime && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="coffee" size={14} color={Colors.textTertiary} />
              <Text style={styles.detailText}>
                {formatTime(new Date(actualStartTime))}
                {actualEndTime ? ` - ${formatTime(new Date(actualEndTime))}` : ""}
              </Text>
            </View>
          )}

          {durationMinutes != null && durationMinutes > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="timer-outline" size={14} color={Colors.info} />
              <Text style={[styles.detailText, { color: Colors.info }]}>
                {hours > 0 && `${hours}h `}{minutes}m
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesText} numberOfLines={2}>{notes}</Text>
          </View>
        )}

        {/* Remove Button */}
        {status === "completed" && onRemove && (
          <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
            <Ionicons name="trash-outline" size={14} color={Colors.error} />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  employeeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  employeeIdText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  notesSection: {
    backgroundColor: Colors.gray50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.error + "10",
    borderRadius: BorderRadius.md,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.error,
  },
});
