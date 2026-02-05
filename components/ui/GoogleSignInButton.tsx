import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { Colors, Shadows } from '@/constants/theme';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';

interface GoogleSignInButtonProps {
  onError?: (error: string) => void;
  disabled?: boolean;
}

/**
 * Google Logo SVG Component
 */
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

/**
 * Google Sign-In button component
 * Handles the OAuth flow using the useGoogleAuth hook
 *
 * This component will not render if Google Sign-In is not configured
 * (i.e., no Google client IDs are set in environment variables)
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onError,
  disabled = false,
}) => {
  const { signIn, isLoading, error, isReady, isAvailable } = useGoogleAuth();

  // Report errors to parent component
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handlePress = () => {
    if (!isLoading && isReady && !disabled) {
      signIn();
    }
  };

  // Don't render the button if Google Sign-In is not configured
  if (!isAvailable) {
    return null;
  }

  const isDisabled = disabled || isLoading || !isReady;

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel={isLoading ? 'Signing in with Google' : 'Continue with Google'}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityHint="Sign in using your Google account"
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.text} style={styles.loader} />
        ) : (
          <View style={styles.logoContainer}>
            <GoogleLogo size={20} />
          </View>
        )}
        <Text style={styles.text}>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  loader: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default GoogleSignInButton;
