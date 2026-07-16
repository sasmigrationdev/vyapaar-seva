import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAlert } from '@/hooks/useAlert';
import { useUserNotifications } from '@/hooks/queries/useNotification';
import {
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/mutations/useNotificationMutations';
import { formatRelativeTime } from '@/lib/utils/date.utils';
import { Notification } from '@/lib/types';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Gradients,
} from '@/constants/theme';

/**
 * Visual config (icon + colors) for each notification type.
 */
const TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  attendance: { icon: 'calendar-clock', color: Colors.primary, bg: '#FFF4E6' },
  salary: { icon: 'wallet', color: Colors.success, bg: '#D1FAE5' },
  leave: { icon: 'beach', color: Colors.pink, bg: Colors.pinkLight },
  announcement: { icon: 'bullhorn', color: Colors.info, bg: '#DBEAFE' },
  system: { icon: 'cog', color: Colors.gray500, bg: Colors.gray100 },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { icon: 'bell', color: Colors.gray500, bg: Colors.gray100 };

/**
 * Shared in-app notifications history screen used by both the employee and HR
 * navigators. Reads from the `notifications` table so items created on
 * check-in/check-out (and other events) show up here on iOS and Android.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { confirmDestructive } = useAlert();
  const userId = user?.id || '';

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications,
    isLoading,
    refetch,
  } = useUserNotifications(userId, undefined, { enabled: !!userId });

  const markAsRead = useMarkAsRead(userId);
  const markAllAsRead = useMarkAllAsRead(userId);
  const deleteNotification = useDeleteNotification(userId);

  // Only employees apply for leave (HR / admin approve, not apply).
  const isEmployee = user?.role === 'employee';

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePressItem = (item: Notification) => {
    if (!item.is_read) {
      markAsRead.mutate({ notificationId: item.id });
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsRead.mutate();
    }
  };

  const handleDelete = (item: Notification) => {
    confirmDestructive(
      'Delete notification',
      'This notification will be permanently removed.',
      () => deleteNotification.mutate({ notificationId: item.id }),
      undefined,
      'Delete'
    );
  };

  const renderItem = (item: Notification) => {
    const config = getTypeConfig(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => handlePressItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.message}${
          item.is_read ? '' : '. Unread'
        }`}
      >
        <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={22}
            color={config.color}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.cardMessage}>{item.message}</Text>
          <Text style={styles.cardTime}>
            {item.created_at ? formatRelativeTime(item.created_at) : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Delete notification: ${item.title}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.gray400} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <LinearGradient
          colors={Gradients.saffronHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroSection, { paddingTop: insets.top + Spacing.md }]}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textInverse} />
            </TouchableOpacity>

            <Text style={styles.heroTitle}>Notifications</Text>

            {unreadCount > 0 ? (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllRead}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
                <Text style={styles.markAllText}>Mark all</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>

          <View style={styles.heroPill}>
            <Ionicons name="notifications" size={16} color={Colors.textInverse} />
            <Text style={styles.heroPillText}>
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'You are all caught up'}
            </Text>
          </View>

          {isEmployee && (
            <TouchableOpacity
              style={styles.applyLeaveButton}
              onPress={() => router.push('/(employee)/leave?apply=1')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Apply for leave"
              accessibilityHint="Opens the leave application form"
            >
              <Ionicons name="add-circle" size={18} color={Colors.primary} />
              <Text style={styles.applyLeaveText}>Apply for Leave</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.contentWrapper}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(60 + index * 50).springify()}
              >
                {renderItem(item)}
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={64}
                color={Colors.gray300}
              />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                Check-ins, check-outs and updates will show up here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.textInverse,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  markAllText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  heroPillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textInverse,
  },
  applyLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.textInverse,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  applyLeaveText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  contentWrapper: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardUnread: {
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: 'rgba(255,153,51,0.25)',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  cardMessage: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardTime: {
    marginTop: 6,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  loadingContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
