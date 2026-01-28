/**
 * Local Authentication Screen
 * Full-screen lock that requires biometric/PIN to unlock
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useLocalAuth } from '@/hooks/auth/useLocalAuth';
import { getBiometricName } from '@/lib/localAuth/localAuth.service';
import { Colors, Typography, Spacing, BorderRadius, Gradients } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LocalAuthScreen() {
  const {
    authenticate,
    isAuthenticating,
    authError,
    biometricType,
    isBiometricEnrolled,
  } = useLocalAuth();

  // Auto-trigger authentication on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      authenticate();
    }, 300);
    return () => clearTimeout(timer);
  }, [authenticate]);

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

  const getButtonText = () => {
    if (isAuthenticating) return 'Verifying...';
    if (isBiometricEnrolled) {
      return `Use ${getBiometricName(biometricType)}`;
    }
    return 'Unlock with Device PIN';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={Gradients.saffronHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.content}>
          {/* Logo/Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="shield-lock"
                size={48}
                color={Colors.textInverse}
              />
            </View>
            <Text style={styles.appName}>Vyapaar Sewa</Text>
            <Text style={styles.subtitle}>App is locked</Text>
          </View>

          {/* Auth Section */}
          <View style={styles.authSection}>
            {/* Biometric Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={getIcon()}
                size={80}
                color={Colors.textInverse}
              />
            </View>

            {/* Error Message */}
            {authError && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={Colors.error}
                />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* Unlock Button */}
            <TouchableOpacity
              style={[
                styles.unlockButton,
                isAuthenticating && styles.unlockButtonDisabled,
              ]}
              onPress={authenticate}
              disabled={isAuthenticating}
              activeOpacity={0.8}
            >
              {isAuthenticating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={isBiometricEnrolled ? getIcon() : 'dialpad'}
                    size={24}
                    color={Colors.primary}
                  />
                  <Text style={styles.unlockButtonText}>{getButtonText()}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Helper text */}
            <Text style={styles.helperText}>
              Tap the button above to unlock
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '500',
    color: Colors.textInverse,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  authSection: {
    alignItems: 'center',
    gap: Spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.error,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.textInverse,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius['2xl'],
    minWidth: 250,
  },
  unlockButtonDisabled: {
    opacity: 0.7,
  },
  unlockButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.primary,
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textInverse,
    opacity: 0.7,
  },
});
