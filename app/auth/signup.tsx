import { useSignUpAsEmployee, useSignUpAsEmployer } from "@/hooks/mutations/useAuthMutations";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { DepthButton } from "@/components/ui/DepthButton";
import { Colors, BorderRadius, Gradients, Typography, Spacing, FontFamily } from "@/constants/theme";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { IS_GOOGLE_CONFIGURED } from "@/hooks/auth/useGoogleAuth";
import { SafeAreaView } from "react-native-safe-area-context";

type UserType = "employer" | "employee";

export default function SignupScreen() {
  const [userType, setUserType] = useState<UserType>("employee");
  const { success, error } = useAlert();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const employerSignUpMutation = useSignUpAsEmployer({
    onSuccess: (data) => {
      const employerCode = data.employerData.employerCode || "N/A";
      success(
        "Account Created!",
        `Your Employer Code: ${employerCode}\n\nSave this code - employees will use it to join your organization.`,
        () => router.replace("/auth/login")
      );
    },
    onError: (err: any) => {
      error("Signup Failed", err?.message || "Failed to create employer account");
    },
  });

  const employeeSignUpMutation = useSignUpAsEmployee({
    onSuccess: () => {
      success(
        "Account Created!",
        "Search for your employer and send a join request to get started.",
        () => router.replace("/auth/login")
      );
    },
    onError: (err: any) => {
      error("Signup Failed", err?.message || "Failed to create employee account");
    },
  });

  const handleSignup = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      error("Error", "Please fill in all required fields");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      error("Error", "Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      error("Error", "Password must be at least 6 characters");
      return;
    }

    if (userType === "employer") {
      employerSignUpMutation.mutate({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        organizationName: formData.fullName,
      });
    } else {
      employeeSignUpMutation.mutate({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone || undefined,
      });
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isLoading = employerSignUpMutation.isPending || employeeSignUpMutation.isPending;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Section */}
      <LinearGradient colors={Gradients.saffronHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSection}>
        <SafeAreaView edges={["top"]} style={styles.heroContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Create Account</Text>
          <Text style={styles.heroSubtitle}>
            {userType === "employer" ? "Register your organization" : "Join as an employee"}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Role Selection */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.roleSection}>
            <Text style={styles.sectionLabel}>I am...</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[styles.roleButton, userType === "employee" && styles.roleButtonActive]}
                onPress={() => setUserType("employee")}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, userType === "employee" && styles.roleIconActive]}>
                  <MaterialCommunityIcons name="account" size={24} color={userType === "employee" ? Colors.primary : Colors.gray400} />
                </View>
                <Text style={[styles.roleTitle, userType === "employee" && styles.roleTitleActive]}>Employee</Text>
                <Text style={styles.roleSubtitle}>Join organization</Text>
                {userType === "employee" && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleButton, userType === "employer" && styles.roleButtonActive]}
                onPress={() => setUserType("employer")}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, userType === "employer" && styles.roleIconActive]}>
                  <MaterialCommunityIcons name="office-building" size={24} color={userType === "employer" ? Colors.primary : Colors.gray400} />
                </View>
                <Text style={[styles.roleTitle, userType === "employer" && styles.roleTitleActive]}>Employer</Text>
                <Text style={styles.roleSubtitle}>Register business</Text>
                {userType === "employer" && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Google Sign-In */}
          {IS_GOOGLE_CONFIGURED && (
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <GoogleSignInButton onError={(err) => error("Google Sign-In Failed", err)} disabled={isLoading} />
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>
            </Animated.View>
          )}

          {/* Full Name */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.inputContainer, focusedField === "fullName" && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, focusedField === "fullName" && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={focusedField === "fullName" ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={Colors.textTertiary}
              value={formData.fullName}
              onChangeText={(v) => updateField("fullName", v)}
              editable={!isLoading}
              onFocus={() => setFocusedField("fullName")}
              onBlur={() => setFocusedField(null)}
            />
          </Animated.View>

          {/* Email */}
          <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.inputContainer, focusedField === "email" && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, focusedField === "email" && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={focusedField === "email" ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textTertiary}
              value={formData.email}
              onChangeText={(v) => updateField("email", v)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </Animated.View>

          {/* Phone (Employee only) */}
          {userType === "employee" && (
            <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.inputContainer, focusedField === "phone" && styles.inputContainerFocused]}>
              <View style={[styles.inputIcon, focusedField === "phone" && styles.inputIconFocused]}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={focusedField === "phone" ? Colors.primary : Colors.gray400} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={Colors.textTertiary}
                value={formData.phone}
                onChangeText={(v) => updateField("phone", v)}
                keyboardType="phone-pad"
                editable={!isLoading}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
              />
            </Animated.View>
          )}

          {/* Password */}
          <Animated.View entering={FadeInDown.delay(350).springify()} style={[styles.inputContainer, focusedField === "password" && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, focusedField === "password" && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={focusedField === "password" ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              value={formData.password}
              onChangeText={(v) => updateField("password", v)}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.gray400} />
            </TouchableOpacity>
          </Animated.View>

          {/* Confirm Password */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.inputContainer, focusedField === "confirmPassword" && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, focusedField === "confirmPassword" && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={focusedField === "confirmPassword" ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.textTertiary}
              value={formData.confirmPassword}
              onChangeText={(v) => updateField("confirmPassword", v)}
              secureTextEntry
              editable={!isLoading}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
            />
          </Animated.View>

          {/* Info Box */}
          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              {userType === "employer"
                ? "You'll receive a unique code for employees to join your organization."
                : "After signup, search for your employer and send a join request."}
            </Text>
          </Animated.View>

          {/* Login Link */}
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <TouchableOpacity style={styles.loginLink} onPress={() => router.back()} disabled={isLoading}>
              <Text style={styles.loginLinkText}>Already have an account?</Text>
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomCTA}>
          <Animated.View entering={FadeInDown.delay(550).springify()}>
            <DepthButton
              onPress={handleSignup}
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              size="lg"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </DepthButton>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  heroContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "800",
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    marginTop: Spacing.xs,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  roleSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  roleButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  roleButton: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  roleIconActive: {
    backgroundColor: Colors.primary + "15",
  },
  roleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  roleTitleActive: {
    color: Colors.primary,
  },
  roleSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  roleCheck: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  inputIcon: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  inputIconFocused: {
    backgroundColor: Colors.primary + "08",
    borderTopLeftRadius: BorderRadius.xl - 1,
    borderBottomLeftRadius: BorderRadius.xl - 1,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  eyeButton: {
    padding: Spacing.md,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "08",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: "flex-start",
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  loginLinkText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  loginLinkBold: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
