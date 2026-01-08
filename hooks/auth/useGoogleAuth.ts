import { useEffect, useState, useCallback } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSignInWithGoogle } from '@/hooks/mutations/useAuthMutations';

// Get Google Client IDs from environment
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Check if running in Expo Go (native modules not available)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Dynamically import Google Sign-In only when not in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;
let isSuccessResponse: any = null;

// Only try to load native Google Sign-In when NOT in Expo Go
if (!isExpoGo) {
  try {
    const googleSignInModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;
    isSuccessResponse = googleSignInModule.isSuccessResponse;
  } catch (e) {
    console.warn('Google Sign-In native module not available:', e);
  }
}

// Check if Google Sign-In is configured and available
export const IS_GOOGLE_CONFIGURED = !!WEB_CLIENT_ID && !isExpoGo && !!GoogleSignin;

/**
 * Hook for handling Google OAuth authentication flow using native Google Sign-In
 * Uses @react-native-google-signin/google-signin for production-proven reliability
 *
 * Required environment variables:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: Web OAuth Client ID (required for ID token)
 *
 * Returns isAvailable: false if Google Sign-In is not configured
 */
export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const signInMutation = useSignInWithGoogle({
    onError: (err) => {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    },
    onSuccess: () => {
      setIsLoading(false);
    },
  });

  // Configure Google Sign-In on mount
  useEffect(() => {
    if (WEB_CLIENT_ID && GoogleSignin && !isExpoGo) {
      try {
        GoogleSignin.configure({
          webClientId: WEB_CLIENT_ID,
          offlineAccess: true,
        });
        setIsReady(true);
      } catch (err) {
        console.warn('Failed to configure Google Sign-In:', err);
        setIsReady(false);
      }
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!isReady || !IS_GOOGLE_CONFIGURED) {
      setError('Google Sign-In is not ready');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Check if device has Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Perform the sign-in
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          // Pass ID token to Supabase for authentication
          signInMutation.mutate({ idToken });
        } else {
          throw new Error('No ID token received from Google');
        }
      } else {
        // User cancelled or other non-success response
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);

      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in flow - don't show error
        setIsLoading(false);
      } else if (statusCodes && err.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
        setError('Sign-in is already in progress');
        setIsLoading(false);
      } else if (statusCodes && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services is not available on this device');
        setIsLoading(false);
      } else {
        setError(err.message || 'Failed to sign in with Google');
        setIsLoading(false);
      }
    }
  }, [isReady, signInMutation]);

  return {
    signIn,
    isLoading: isLoading || signInMutation.isPending,
    error,
    isReady,
    isAvailable: IS_GOOGLE_CONFIGURED,
  };
};
