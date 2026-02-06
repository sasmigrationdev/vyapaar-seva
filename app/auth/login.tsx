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
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAlert } from "@/hooks/useAlert";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { DepthButton } from "@/components/ui/DepthButton";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSignIn } from "@/hooks/mutations/useAuthMutations";
import { Colors, BorderRadius, Gradients, Typography, Spacing, FontFamily } from "@/constants/theme";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { IS_GOOGLE_CONFIGURED } from "@/hooks/auth/useGoogleAuth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { error } = useAlert();

  const signInMutation = useSignIn({
    onSuccess: () => {},
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

      {/* Hero Section */}
      <LinearGradient colors={Gradients.saffronHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSection}>
        <SafeAreaView edges={["top"]} style={styles.heroContent}>
          <View style={styles.logoWrapper}>
            <Image source={require("@/assets/images/logovs.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>VYAPAAR SEWA</Text>
          <Text style={styles.tagline}>Attendance & Salary Management</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </Animated.View>

          {/* Email */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
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
              editable={!signInMutation.isPending}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </Animated.View>

          {/* Password */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
            <View style={[styles.inputIcon, passwordFocused && styles.inputIconFocused]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={passwordFocused ? Colors.primary : Colors.gray400} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!signInMutation.isPending}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.gray400} />
            </TouchableOpacity>
          </Animated.View>

          {/* Forgot Password */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <Link href="/auth/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Divider & Google */}
          {IS_GOOGLE_CONFIGURED && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton onError={(err) => error("Google Sign-In Failed", err)} disabled={signInMutation.isPending} />
            </Animated.View>
          )}

          {/* Create Account */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Link href="/auth/signup" asChild>
              <TouchableOpacity style={styles.createAccountButton} activeOpacity={0.7}>
                <Text style={styles.createAccountText}>Don't have an account?</Text>
                <Text style={styles.createAccountLink}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomCTA}>
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <DepthButton
              onPress={handleLogin}
              disabled={signInMutation.isPending}
              loading={signInMutation.isPending}
              variant="primary"
              size="lg"
            >
              {signInMutation.isPending ? "Signing in..." : "Sign In"}
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    alignItems: "center",
  },
  logoWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "800",
    color: Colors.textInverse,
    letterSpacing: -0.5,
  },
  tagline: {
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
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
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: Spacing.sm,
  },
  forgotButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
  createAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  createAccountText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  createAccountLink: {
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
