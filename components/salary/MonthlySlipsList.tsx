import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useState, useEffect } from 'react';
import { getAvailableMonths, downloadSalarySlip } from '@/lib/utils/salarySlip.utils';
import { formatCurrency } from '@/lib/utils/salary.utils';

interface MonthlySlipsListProps {
  userId: string;
}

export default function MonthlySlipsList({ userId }: MonthlySlipsListProps) {
  const { success, error } = useAlert();
  const [months, setMonths] = useState<
    Array<{
      month: number;
      year: number;
      totalHours: number;
      earnedSalary: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

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
    try {
      setDownloadingMonth(key);
      await downloadSalarySlip(userId, month, year);
      success('Success', 'Salary slip downloaded successfully');
    } catch (err) {
      console.error('Error downloading salary slip:', err);
      error('Error', 'Failed to download salary slip');
    } finally {
      setDownloadingMonth(null);
    }
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingText}>Loading salary slips...</Text>
      </View>
    );
  }

  if (months.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>No salary slips available</Text>
        <Text style={styles.emptySubtext}>
          Salary slips will appear here once attendance and earnings are recorded
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {months.map((monthData) => {
        const key = `${monthData.year}-${monthData.month}`;
        const isDownloading = downloadingMonth === key;

        return (
          <View key={key} style={styles.monthCard}>
            <View style={styles.monthInfo}>
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="file-document" size={24} color="#6366F1" />
              </View>
              <View style={styles.monthDetails}>
                <Text style={styles.monthTitle}>
                  {getMonthName(monthData.month)} {monthData.year}
                </Text>
                <Text style={styles.monthStats}>
                  {monthData.totalHours.toFixed(1)} hrs • {formatCurrency(monthData.earnedSalary)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
              onPress={() => handleDownload(monthData.month, monthData.year)}
              disabled={isDownloading}
              activeOpacity={0.7}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={20} color="#6366F1" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDetails: {
    flex: 1,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  monthStats: {
    fontSize: 13,
    color: '#64748B',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
});
