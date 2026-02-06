import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useState, useEffect, useMemo } from 'react';
import Animated, {
  FadeInRight,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getAvailableMonths, downloadSalarySlip } from '@/lib/utils/salarySlip.utils';
import { formatCurrency } from '@/lib/utils/salary.utils';
import { usePayslipDownloads } from '@/hooks/queries/usePayslipDownloads';
import { useRecordPayslipDownload } from '@/hooks/mutations/usePayslipDownloadMutations';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';

interface MonthlySlipsListProps {
  userId: string;
}

interface MonthData {
  month: number;
  year: number;
  totalHours: number;
  earnedSalary: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SlipCard = ({
  monthData,
  index,
  isDownloaded,
  downloadedAt,
  isDownloading,
  onDownload,
}: {
  monthData: MonthData;
  index: number;
  isDownloaded: boolean;
  downloadedAt?: string;
  isDownloading: boolean;
  onDownload: () => void;
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  const formatDownloadDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDownloadPress = () => {
    if (!isDownloaded && !isDownloading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDownload();
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).springify()}
      layout={Layout.springify()}
      style={[styles.monthCard, cardStyle]}
    >
      <TouchableOpacity
        style={styles.cardTouchable}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isDownloaded}
        onPress={handleDownloadPress}
      >
        <View style={styles.monthInfo}>
          <View style={[styles.iconWrapper, isDownloaded && styles.iconWrapperDownloaded]}>
            <MaterialCommunityIcons
              name={isDownloaded ? 'check-circle' : 'file-document'}
              size={24}
              color={isDownloaded ? Colors.success : Colors.indigo}
            />
          </View>
          <View style={styles.monthDetails}>
            <Text style={styles.monthTitle}>
              {getMonthName(monthData.month)} {monthData.year}
            </Text>
            <View style={styles.monthStatsRow}>
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.monthStatText}>
                  {monthData.totalHours.toFixed(1)} hrs
                </Text>
              </View>
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="currency-inr" size={12} color={Colors.textSecondary} />
                <Text style={styles.monthStatText}>
                  {formatCurrency(monthData.earnedSalary)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isDownloaded ? (
          <View style={styles.downloadedBadge}>
            <MaterialCommunityIcons name="check" size={16} color={Colors.success} />
            <View style={styles.downloadedTextContainer}>
              <Text style={styles.downloadedText}>Downloaded</Text>
              {downloadedAt && (
                <Text style={styles.downloadedDate}>
                  {formatDownloadDate(downloadedAt)}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
            onPress={handleDownloadPress}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.indigo} />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={18} color={Colors.indigo} />
                <Text style={styles.downloadButtonText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MonthlySlipsList({ userId }: MonthlySlipsListProps) {
  const { success, error } = useAlert();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  // Fetch download records
  const { data: downloads = [] } = usePayslipDownloads(userId);
  const recordDownload = useRecordPayslipDownload(userId);

  // Create a Map for O(1) lookup of downloaded payslips
  const downloadedMap = useMemo(() => {
    const map = new Map<string, { downloadedAt: string }>();
    downloads.forEach((download) => {
      const key = `${download.year}-${download.month}`;
      map.set(key, { downloadedAt: download.downloaded_at });
    });
    return map;
  }, [downloads]);

  useEffect(() => {
    loadAvailableMonths();
  }, [userId]);

  const loadAvailableMonths = async () => {
    try {
      setLoading(true);
      const data = await getAvailableMonths(userId);
      setMonths(data);
    } catch (err) {
      console.error('Error loading available months:', err);
      error('Error', 'Failed to load salary slip months');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (month: number, year: number) => {
    const key = `${year}-${month}`;

    // Check if already downloaded
    if (downloadedMap.has(key)) {
      return;
    }

    // Show confirmation alert
    Alert.alert(
      'Download Payslip',
      "Once downloaded, you won't be able to download this payslip again. Continue?",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Download',
          onPress: () => executeDownload(month, year, key),
        },
      ],
      { cancelable: true }
    );
  };

  const executeDownload = async (month: number, year: number, key: string) => {
    try {
      setDownloadingMonth(key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // First, attempt to download the PDF
      await downloadSalarySlip(userId, month, year);

      // Only record the download AFTER successful PDF generation
      await recordDownload.mutateAsync({ month, year });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      success('Success', 'Salary slip downloaded successfully');
    } catch (err) {
      console.error('Error downloading salary slip:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      error('Error', 'Failed to download salary slip. Please try again.');
    } finally {
      setDownloadingMonth(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.indigo} />
        <Text style={styles.loadingText}>Loading salary slips...</Text>
      </View>
    );
  }

  if (months.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={Colors.gray300} />
        </View>
        <Text style={styles.emptyText}>No salary slips available</Text>
        <Text style={styles.emptySubtext}>
          Salary slips will appear here once attendance and earnings are recorded
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {months.map((monthData, index) => {
        const key = `${monthData.year}-${monthData.month}`;
        const isDownloading = downloadingMonth === key;
        const downloadInfo = downloadedMap.get(key);
        const isDownloaded = !!downloadInfo;

        return (
          <SlipCard
            key={key}
            monthData={monthData}
            index={index}
            isDownloaded={isDownloaded}
            downloadedAt={downloadInfo?.downloadedAt}
            isDownloading={isDownloading}
            onDownload={() => handleDownload(monthData.month, monthData.year)}
          />
        );
      })}
    </View>
  );
}

// Export for use in trend chart
export type { MonthData };

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  monthCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperDownloaded: {
    backgroundColor: Colors.success + '15',
  },
  monthDetails: {
    flex: 1,
  },
  monthTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  monthStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthStatText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.indigoLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
    justifyContent: 'center',
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.indigo,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success + '15',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  downloadedTextContainer: {
    alignItems: 'flex-start',
  },
  downloadedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.success,
  },
  downloadedDate: {
    fontSize: 10,
    color: Colors.success,
    opacity: 0.8,
    marginTop: 1,
  },
});
