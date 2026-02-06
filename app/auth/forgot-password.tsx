import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { DepthButton } from "@/components/ui/DepthButton";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useResetPassword } from "@/hooks/mutations/useAuthMutations";
import { Colors, BorderRadius, Gradients, Typography, Spacing, FontFamily } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

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

      {/* Hero Section */}
      <LinearGradient colors={Gradients.saffronHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSection}>
        <SafeAreaView edges={["top"]} style={styles.heroContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Reset Password</Text>
          <Text style={styles.heroSubtitle}>We'll send you reset instructions</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainer}>
        <View style={styles.content}>
          {/* Icon */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.iconWrapper}>
            <MaterialCommunityIcons name="lock-reset" size={40} color={Colors.primary} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </Animated.View>

          {/* Email */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, emailFocused && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={emailFocused ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!resetPasswordMutation.isPending}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </Animated.View>

          {/* Back to Login */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()} disabled={resetPasswordMutation.isPending}>
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom CTA */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomCTA}>
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <DepthButton
              onPress={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              loading={resetPasswordMutation.isPending}
              variant="primary"
              size="lg"
            >
              {resetPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  backToLoginText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
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
