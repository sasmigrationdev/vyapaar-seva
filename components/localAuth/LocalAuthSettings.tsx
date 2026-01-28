/**
 * Local Authentication Settings Component
 * Toggle and status display for app lock feature
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useLocalAuth } from '@/hooks/auth/useLocalAuth';
import { getBiometricName } from '@/lib/localAuth/localAuth.service';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export function LocalAuthSettings() {
  const {
    isEnabled,
    isBiometricSupported,
    isBiometricEnrolled,
    biometricType,
    toggle,
  } = useLocalAuth();

  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsToggling(true);
    setError(null);

    try {
      await toggle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setIsToggling(false);
    }
  };

  const getIcon = () => {
    switch (biometricType) {
      case 'facial':
        return 'face-recognition';
      case 'fingerprint':
        return 'fingerprint';
      case 'iris':
        return 'eye-outline';
      default:
        return 'lock';
    }
  };

  const getStatusText = () => {
    if (!isBiometricSupported) {
      return 'Not supported on this device';
    }
    if (!isBiometricEnrolled) {
      return 'No biometrics enrolled - will use device PIN';
    }
    if (isEnabled) {
      return `Protected with ${getBiometricName(biometricType)}`;
    }
    return 'Disabled';
  };

  const getStatusColor = () => {
    if (!isBiometricSupported) return Colors.textTertiary;
    if (isEnabled) return Colors.success;
    return Colors.textSecondary;
  };

  // Don't render if device doesn't support local auth
  if (!isBiometricSupported) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconWrapper, isEnabled && styles.iconWrapperActive]}>
          <MaterialCommunityIcons
            name={getIcon()}
            size={22}
            color={isEnabled ? Colors.success : Colors.primary}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>App Lock</Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {isToggling ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Switch
            value={isEnabled}
            onValueChange={handleToggle}
            trackColor={{
              false: Colors.gray200,
              true: Colors.primaryLight,
            }}
            thumbColor={isEnabled ? Colors.primary : Colors.gray400}
            ios_backgroundColor={Colors.gray200}
          />
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isEnabled && (
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.infoText}>
            You'll need to verify your identity when opening the app
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 64,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapperActive: {
    backgroundColor: Colors.success + '15',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },
  status: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
