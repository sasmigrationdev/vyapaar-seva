import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Colors, Shadows } from '@/constants/theme';
import { useAlert } from '@/hooks/useAlert';
import { supabase } from '@/lib/supabase/client';
import { employerMutations } from '@/lib/api/mutations/employer.mutations';
import { useQueryClient } from '@tanstack/react-query';

type UserType = 'employer' | 'employee';

/**
 * Role selection screen for new Google sign-in users
 * Shows after first-time Google authentication when user doesn't have a profile
 */
export default function SelectRoleScreen() {
  const [userType, setUserType] = useState<UserType>('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [userInfo, setUserInfo] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const { success, error } = useAlert();
  const queryClient = useQueryClient();

  // Get current user info from Supabase session
  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        setUserInfo({
          id: session.user.id,
          email: session.user.email || '',
          fullName: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || '',
        });
        // Pre-fill organization name with user's name for employers
        if (metadata.full_name || metadata.name) {
          setOrganizationName(`${metadata.full_name || metadata.name}'s Organization`);
        }
      }
    };
    getUserInfo();
  }, []);

  const handleContinue = async () => {
    if (!userInfo) {
      error('Error', 'Unable to get user information. Please try again.');
      return;
    }

    if (userType === 'employer' && !organizationName.trim()) {
      error('Error', 'Please enter your organization name');
      return;
    }

    setIsLoading(true);

    try {
      if (userType === 'employer') {
        // Register as employer (creates organization + profile)
        const employerData = await employerMutations.registerEmployer({
          authUserId: userInfo.id,
          fullName: userInfo.fullName,
          email: userInfo.email,
          organizationName: organizationName.trim(),
        });

        // Invalidate queries to refresh user data
        queryClient.invalidateQueries();

        success(
          'Welcome!',
          `Your employer account has been created!\n\nYour Employer Code: ${employerData.employerCode || 'N/A'}\n\nPlease save this code - employees will use it to find and join your organization.`,
          () => router.replace('/(hr)')
        );
      } else {
        // Create employee profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userInfo.id,
            email: userInfo.email,
            full_name: userInfo.fullName,
            role: 'employee',
            is_active: true,
          });

        if (insertError) throw insertError;

        // Invalidate queries to refresh user data
        queryClient.invalidateQueries();

        success(
          'Welcome!',
          'Your employee account has been created!\n\nNext step: Search for your employer by their code, organization name, or email, and send a join request.',
          () => router.replace('/(employee)')
        );
      }
    } catch (err: any) {
      console.error('Role selection error:', err);
      error('Error', err?.message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Gradient Header */}
      <LinearGradient
        colors={['#E67300', '#FF9933', '#FFB366']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Almost There!</Text>
          <Text style={styles.headerSubtitle}>Tell us about yourself</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Welcome Message */}
            {userInfo && (
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>Welcome, {userInfo.fullName}!</Text>
                <Text style={styles.emailText}>{userInfo.email}</Text>
              </View>
            )}

            {/* Role Selection */}
            <View style={styles.typeSection}>
              <Text style={styles.typeSectionTitle}>I am...</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'employee' && styles.typeButtonActive,
                  ]}
                  onPress={() => setUserType('employee')}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={32}
                    color={userType === 'employee' ? Colors.primary : Colors.gray400}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'employee' && styles.typeButtonTextActive,
                    ]}
                  >
                    An Employee
                  </Text>
                  <Text style={styles.typeButtonSubtext}>
                    Join an organization
                  </Text>
                  {userType === 'employee' && (
                    <View style={styles.typeCheckmark}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'employer' && styles.typeButtonActive,
                  ]}
                  onPress={() => setUserType('employer')}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons
                    name="office-building"
                    size={32}
                    color={userType === 'employer' ? Colors.primary : Colors.gray400}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'employer' && styles.typeButtonTextActive,
                    ]}
                  >
                    An Employer
                  </Text>
                  <Text style={styles.typeButtonSubtext}>
                    Register my business
                  </Text>
                  {userType === 'employer' && (
                    <View style={styles.typeCheckmark}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Organization Name (for employers) */}
            {userType === 'employer' && (
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="office-building-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Organization Name *"
                  placeholderTextColor={Colors.gray400}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  editable={!isLoading}
                />
              </View>
            )}

            {/* Info Message */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoText}>
                {userType === 'employer'
                  ? "You'll receive a unique employer code that employees can use to find and join your organization."
                  : 'After setup, search for your employer and send a join request to get started.'}
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Setting up...' : 'Continue'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Shadows.md,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  typeSection: {
    marginBottom: 20,
  },
  typeSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    minHeight: 130,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 153, 51, 0.06)',
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  typeButtonTextActive: {
    color: Colors.primary,
  },
  typeButtonSubtext: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 4,
  },
  typeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
    color: Colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 153, 51, 0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 51, 0.12)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  button: {
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    ...Shadows.primary,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
