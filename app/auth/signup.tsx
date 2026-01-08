import {
  useSignUpAsEmployee,
  useSignUpAsEmployer,
} from "@/hooks/mutations/useAuthMutations";
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
  Image,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { IS_GOOGLE_CONFIGURED } from "@/hooks/auth/useGoogleAuth";

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

  const employerSignUpMutation = useSignUpAsEmployer({
    onSuccess: (data) => {
      const employerCode = data.employerData.employerCode || "N/A";
      success(
        "Success!",
        `Your employer account has been created!\n\nYour Employer Code: ${employerCode}\n\nPlease save this code - employees will use it to find and join your organization.`,
        () => router.replace("/auth/login")
      );
    },
    onError: (err: any) => {
      console.error("===== EMPLOYER SIGNUP ERROR =====");
      console.error("Error:", err);
      console.error("================================");
      error(
        "Signup Failed",
        err?.message || "Failed to create employer account"
      );
    },
  });

  const employeeSignUpMutation = useSignUpAsEmployee({
    onSuccess: () => {
      success(
        "Success!",
        "Your employee account has been created!\n\nNext step: Search for your employer by their code, organization name, or email, and send a join request.",
        () => router.replace("/auth/login")
      );
    },
    onError: (err: any) => {
      console.error("===== EMPLOYEE SIGNUP ERROR =====");
      console.error("Error:", err);
      console.error("================================");
      error(
        "Signup Failed",
        err?.message || "Failed to create employee account"
      );
    },
  });

  const handleSignup = () => {
    // Validation
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

    // Sign up based on user type
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

  const isLoading =
    employerSignUpMutation.isPending || employeeSignUpMutation.isPending;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Gradient Header */}
      <LinearGradient
        colors={["#E67300", "#FF9933", "#FFB366"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/logovs.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>VYAPAAR SEWA</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {userType === "employer"
                ? "Register your organization"
                : "Join as an employee"}
            </Text>

            <View style={styles.form}>
              {/* User Type Selection - First */}
              <View style={styles.typeSection}>
                <Text style={styles.typeSectionTitle}>I am...</Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      userType === "employee" && styles.typeButtonActive,
                    ]}
                    onPress={() => setUserType("employee")}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={32}
                      color={userType === "employee" ? Colors.primary : Colors.gray400}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        userType === "employee" && styles.typeButtonTextActive,
                      ]}
                    >
                      An Employee
                    </Text>
                    <Text style={styles.typeButtonSubtext}>
                      Join an organization
                    </Text>
                    {userType === "employee" && (
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
                      userType === "employer" && styles.typeButtonActive,
                    ]}
                    onPress={() => setUserType("employer")}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons
                      name="office-building"
                      size={32}
                      color={userType === "employer" ? Colors.primary : Colors.gray400}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        userType === "employer" && styles.typeButtonTextActive,
                      ]}
                    >
                      An Employer
                    </Text>
                    <Text style={styles.typeButtonSubtext}>
                      Register my business
                    </Text>
                    {userType === "employer" && (
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

              {/* Google Sign-In Option */}
              {IS_GOOGLE_CONFIGURED && (
                <>
                  <GoogleSignInButton
                    onError={(err) => error("Google Sign-In Failed", err)}
                    disabled={isLoading}
                  />

                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR SIGN UP WITH EMAIL</Text>
                    <View style={styles.divider} />
                  </View>
                </>
              )}

              {/* Common fields */}
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  placeholderTextColor={Colors.gray400}
                  value={formData.fullName}
                  onChangeText={(value) => updateField("fullName", value)}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email *"
                  placeholderTextColor={Colors.gray400}
                  value={formData.email}
                  onChangeText={(value) => updateField("email", value)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              {/* Employee-specific fields */}
              {userType === "employee" && (
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={20}
                    color={Colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone (optional)"
                    placeholderTextColor={Colors.gray400}
                    value={formData.phone}
                    onChangeText={(value) => updateField("phone", value)}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password *"
                  placeholderTextColor={Colors.gray400}
                  value={formData.password}
                  onChangeText={(value) => updateField("password", value)}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password *"
                  placeholderTextColor={Colors.gray400}
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField("confirmPassword", value)}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {/* Info message */}
              {userType === "employer" && (
                <View style={styles.infoBox}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoText}>
                    You'll receive a unique employer code that employees can use
                    to find and join your organization.
                  </Text>
                </View>
              )}

              {userType === "employee" && (
                <View style={styles.infoBox}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoText}>
                    After signup, search for your employer and send a join request
                    to get started.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Creating Account..." : "Sign Up"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>
                  Already have an account? Login
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  logoSection: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Shadows.md,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
    color: Colors.textSecondary,
  },
  form: {
    width: "100%",
  },
  typeSection: {
    marginBottom: 20,
  },
  typeSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  typeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
    minHeight: 130,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255, 153, 51, 0.06)",
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  typeButtonTextActive: {
    color: Colors.primary,
  },
  typeButtonSubtext: {
    fontSize: 12,
    color: Colors.gray400,
    textAlign: "center",
    marginTop: 4,
  },
  typeCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: "#FAFAFA",
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
    flexDirection: "row",
    backgroundColor: "rgba(255, 153, 51, 0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 153, 51, 0.12)",
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
    overflow: "hidden",
    ...Shadows.primary,
  },
  buttonGradient: {
    padding: 18,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    padding: 8,
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: "600",
  },
});
