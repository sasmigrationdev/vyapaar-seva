/**
 * OverviewTab
 *
 * Personal information display with:
 * - Clean contact info layout
 * - Working days visual indicator
 * - Contact action buttons
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { User } from "@/lib/types";
import { formatDate } from "@/lib/utils/date.utils";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import AnimatedRN, { FadeIn } from "react-native-reanimated";

interface OverviewTabProps {
  employee: User;
  onEditPress: () => void;
}

const WEEKDAYS = [
  { key: "monday", label: "M" },
  { key: "tuesday", label: "T" },
  { key: "wednesday", label: "W" },
  { key: "thursday", label: "T" },
  { key: "friday", label: "F" },
  { key: "saturday", label: "S" },
  { key: "sunday", label: "S" },
];

export default function OverviewTab({ employee, onEditPress }: OverviewTabProps) {
  const workingDays = (employee.working_days as string[]) || [];

  const handleCall = () => {
    if (employee.phone) {
      Linking.openURL(`tel:${employee.phone}`);
    }
  };

  const handleEmail = () => {
    if (employee.email) {
      Linking.openURL(`mailto:${employee.email}`);
    }
  };

  return (
    <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Contact Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Contact</Text>
          {(employee.phone || employee.email) && (
            <View style={styles.contactActions}>
              {employee.phone && (
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: Colors.success + "15" }]}
                  onPress={handleCall}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={16} color={Colors.success} />
                </TouchableOpacity>
              )}
              {employee.email && (
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: Colors.info + "15" }]}
                  onPress={handleEmail}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail" size={16} color={Colors.info} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.infoList}>
          <InfoRow
            icon={<Ionicons name="mail-outline" size={18} color={Colors.gray500} />}
            value={employee.email}
            placeholder="No email added"
          />
          <InfoRow
            icon={<Ionicons name="call-outline" size={18} color={Colors.gray500} />}
            value={employee.phone}
            placeholder="No phone added"
          />
        </View>
      </View>

      {/* Work Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Work Details</Text>
          <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
            <Feather name="edit-2" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoList}>
          <InfoRow
            icon={<MaterialCommunityIcons name="office-building-outline" size={18} color={Colors.gray500} />}
            label="Department"
            value={employee.department}
            placeholder="Not set"
          />
          <InfoRow
            icon={<MaterialCommunityIcons name="badge-account-outline" size={18} color={Colors.gray500} />}
            label="Designation"
            value={employee.designation}
            placeholder="Not set"
          />
          <InfoRow
            icon={<Ionicons name="calendar-outline" size={18} color={Colors.gray500} />}
            label="Joined"
            value={employee.date_of_joining ? formatDate(new Date(employee.date_of_joining)) : null}
            placeholder="Not set"
          />
        </View>
      </View>

      {/* Working Schedule Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Working Schedule</Text>
        </View>

        {/* Working Days Visual */}
        <View style={styles.scheduleContent}>
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((day) => {
              const isWorking = workingDays.includes(day.key);
              return (
                <View
                  key={day.key}
                  style={[
                    styles.dayPill,
                    isWorking ? styles.dayPillActive : styles.dayPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isWorking ? styles.dayTextActive : styles.dayTextInactive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.scheduleInfo}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleValue}>
                {workingDays.length || "—"}
              </Text>
              <Text style={styles.scheduleLabel}>days/week</Text>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleValue}>
                {employee.daily_working_hours || "—"}
              </Text>
              <Text style={styles.scheduleLabel}>hours/day</Text>
            </View>
          </View>
        </View>
      </View>
    </AnimatedRN.View>
  );
}

// Info Row Component
interface InfoRowProps {
  icon: React.ReactNode;
  label?: string;
  value: string | null | undefined;
  placeholder?: string;
}

function InfoRow({ icon, label, value, placeholder = "Not set" }: InfoRowProps) {
  const isEmpty = !value;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        {label && <Text style={styles.infoLabel}>{label}</Text>}
        <Text style={[styles.infoValue, isEmpty && styles.infoValueEmpty]}>
          {value || placeholder}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Contact Actions
  contactActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  contactButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // Info List
  infoList: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 1,
  },
  infoValueEmpty: {
    color: Colors.gray400,
    fontWeight: "400",
  },

  // Schedule
  scheduleContent: {
    gap: Spacing.lg,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  dayPill: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  dayPillActive: {
    backgroundColor: Colors.primary,
  },
  dayPillInactive: {
    backgroundColor: Colors.gray100,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  dayTextInactive: {
    color: Colors.gray400,
  },
  scheduleInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  scheduleItem: {
    alignItems: "center",
  },
  scheduleValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scheduleDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gray200,
  },
});
