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
} from "react-native";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useResetPassword } from "@/hooks/mutations/useAuthMutations";
import { Colors, BorderRadius, Shadows, Gradients } from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const { success, error } = useAlert();

  const resetPasswordMutation = useResetPassword({
    onSuccess: () => {
      success(
        "Check Your Email",
        "Password reset instructions have been sent to your email.",
        () => router.back()
      );
    },
    onError: (err) => {
      error("Error", err.message);
    },
  });

  const handleResetPassword = () => {
    if (!email) {
      error("Error", "Please enter your email address");
      return;
    }

    resetPasswordMutation.mutate({ email });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Gradient Header */}
      <LinearGradient
        colors={Gradients.saffronHero}
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
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={48}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={emailFocused ? Colors.primary : Colors.gray400}
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
                editable={!resetPasswordMutation.isPending}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                resetPasswordMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {resetPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
              disabled={resetPasswordMutation.isPending}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.linkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textInverse,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    padding: 24,
    ...Shadows.lg,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    marginBottom: 16,
    backgroundColor: Colors.gray50,
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
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
  button: {
    borderRadius: BorderRadius.lg,
    marginTop: 8,
    overflow: "hidden",
    ...Shadows.button,
  },
  buttonGradient: {
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginTop: 20,
    gap: 6,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
