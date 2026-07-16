// MUST be the first import: enables iOS WiFi SSID fetching before any other
// NetInfo usage (WiFiConnectivityProvider fetches at startup). See the module docs.
import '@/lib/config/netinfo.config';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import React from 'react';
import 'react-native-reanimated';
import {
  useFonts,
  FunnelSans_400Regular,
  FunnelSans_500Medium,
  FunnelSans_600SemiBold,
  FunnelSans_700Bold,
  FunnelSans_800ExtraBold,
} from '@expo-google-fonts/funnel-sans';
import * as SplashScreen from 'expo-splash-screen';

// Note: useColorScheme removed - forcing light theme for consistency
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { AuthProvider } from '@/lib/providers/AuthProvider';
import { useAuth } from '@/hooks/auth/useAuth';
import { AlertProvider } from '@/hooks/useAlert';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { LocalAuthProvider, useLocalAuth, clearLocalAuthSettings } from '@/lib/providers/LocalAuthProvider';
import { LocalAuthScreen } from '@/components/localAuth/LocalAuthScreen';
import { WiFiConnectivityProvider } from '@/lib/providers/WiFiConnectivityProvider';

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

/**
 * Local Auth Gate - Shows lock screen when app is locked
 */
function LocalAuthGate({ children }: { children: React.ReactNode }) {
  const { isLocked, isEnabled } = useLocalAuth();

  // Show lock screen if enabled and locked
  if (isEnabled && isLocked) {
    return <LocalAuthScreen />;
  }

  return <>{children}</>;
}

/**
 * Main Navigation with Local Auth
 */
function RootLayoutNavWithAuth() {
  const { session, user, loading, needsRoleSelection } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize push notifications after auth is loaded
  const { expoPushToken, error: pushError } = usePushNotifications();

  // Log push notification status for debugging
  useEffect(() => {
    if (pushError) {
      console.warn('Push notification error:', pushError);
    }
    if (expoPushToken) {
      console.log('Push token registered:', expoPushToken);
    }
  }, [expoPushToken, pushError]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inEmployeeGroup = segments[0] === '(employee)';
    const inHRGroup = segments[0] === '(hr)';
    const inRoleSelection = segments[1] === 'select-role';

    // Redirect logic
    if (!session && !inAuthGroup) {
      // Not signed in, redirect to welcome
      router.replace('/auth/welcome');
    } else if (session && needsRoleSelection && !inRoleSelection) {
      // User is authenticated but needs to select a role (new Google user)
      router.replace('/auth/select-role');
    } else if (session && !needsRoleSelection && inAuthGroup && !inRoleSelection) {
      // Signed in with profile but on auth screen (not role selection), redirect based on role
      if (user?.role === 'hr' || user?.role === 'admin') {
        router.replace('/(hr)');
      } else {
        router.replace('/(employee)');
      }
    } else if (session && user && !needsRoleSelection) {
      // Ensure user is in correct role group
      const isHR = user.role === 'hr' || user.role === 'admin';
      if (isHR && inEmployeeGroup) {
        router.replace('/(hr)');
      } else if (!isHR && inHRGroup) {
        router.replace('/(employee)');
      }
    }
  }, [session, user, segments, loading, needsRoleSelection]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#138808" />
      </View>
    );
  }

  return (
    <LocalAuthGate>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(employee)" options={{ headerShown: false }} />
        <Stack.Screen name="(hr)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
    </LocalAuthGate>
  );
}

/**
 * Root Layout Nav with LocalAuthProvider and WiFiConnectivityProvider wrappers
 */
function RootLayoutNav() {
  const { session, user } = useAuth();

  return (
    <LocalAuthProvider isAuthenticated={!!session}>
      <WiFiConnectivityProvider
        organizationId={user?.organization_id ?? undefined}
        enabled={!!session}
      >
        <RootLayoutNavWithAuth />
      </WiFiConnectivityProvider>
    </LocalAuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default function RootLayout() {
  // Load Funnel Sans fonts
  const [fontsLoaded, fontError] = useFonts({
    FunnelSans_400Regular,
    FunnelSans_500Medium,
    FunnelSans_600SemiBold,
    FunnelSans_700Bold,
    FunnelSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return loading screen while fonts are loading
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <AlertProvider>
        {/* Force light theme for consistency across iOS and Android */}
        <ThemeProvider value={DefaultTheme}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
          <StatusBar style="dark" />
        </ThemeProvider>
      </AlertProvider>
    </QueryProvider>
  );
}
