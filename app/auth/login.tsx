import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useSignIn } from "@/hooks/mutations/useAuthMutations";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { error } = useAlert();

  const signInMutation = useSignIn({
    onSuccess: () => {
      // Navigation is handled by root layout based on user role
    },
    onError: (err) => {
      error("Login Failed", err.message);
    },
  });

  const handleLogin = () => {
    if (!email || !password) {
      error("Error", "Please fill in all fields");
      return;
    }

    signInMutation.mutate({ email, password });
  };

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
        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/logovs.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>VYAPAAR SEVA</Text>
          <Text style={styles.tagline}>Attendance & Salary Management</Text>
        </View>
      </LinearGradient>

      {/* Form Card */}
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
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.instructionText}>Sign in to continue</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.gray400}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!signInMutation.isPending}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!signInMutation.isPending}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, signInMutation.isPending && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={signInMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {signInMutation.isPending ? "Logging in..." : "Login"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Link href="/auth/forgot-password" asChild>
                <TouchableOpacity style={styles.linkButton}>
                  <Text style={styles.linkText}>Forgot Password?</Text>
                </TouchableOpacity>
              </Link>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <Link href="/auth/signup" asChild>
                <TouchableOpacity style={styles.secondaryButton}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.secondaryButtonText}>Create New Account</Text>
                </TouchableOpacity>
              </Link>
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
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoSection: {
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    fontWeight: "500",
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
  welcomeText: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  form: {
    width: "100%",
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
  eyeButton: {
    padding: 8,
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
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: Colors.gray400,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
