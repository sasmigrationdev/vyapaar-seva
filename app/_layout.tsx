import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { useAuth } from '@/hooks/auth/useAuth';
import { AlertProvider } from '@/hooks/useAlert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, user, loading } = useAuth();
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

    // Redirect logic
    if (!session && !inAuthGroup) {
      // Not signed in, redirect to welcome
      router.replace('/auth/welcome');
    } else if (session && inAuthGroup) {
      // Signed in but on auth screen, redirect based on role
      if (user?.role === 'hr' || user?.role === 'admin') {
        router.replace('/(hr)');
      } else {
        router.replace('/(employee)');
      }
    } else if (session && user) {
      // Ensure user is in correct role group
      const isHR = user.role === 'hr' || user.role === 'admin';
      if (isHR && inEmployeeGroup) {
        router.replace('/(hr)');
      } else if (!isHR && inHRGroup) {
        router.replace('/(employee)');
      }
    }
  }, [session, user, segments, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#138808" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(employee)" options={{ headerShown: false }} />
      <Stack.Screen name="(hr)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
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
  const colorScheme = useColorScheme();

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
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AlertProvider>
    </QueryProvider>
  );
}
