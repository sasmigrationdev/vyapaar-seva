import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { DepthButton } from "@/components/ui/DepthButton";
import { Colors, Gradients, Typography, Spacing, BorderRadius, FontFamily } from "@/constants/theme";
import { useAlert } from "@/hooks/useAlert";
import { supabase } from "@/lib/supabase/client";
import { employerMutations } from "@/lib/api/mutations/employer.mutations";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

type UserType = "employer" | "employee";

export default function SelectRoleScreen() {
  const [userType, setUserType] = useState<UserType>("employee");
  const [isLoading, setIsLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [orgFocused, setOrgFocused] = useState(false);
  const [userInfo, setUserInfo] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const { success, error } = useAlert();
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const metadata = session.user.user_metadata || {};
        setUserInfo({
          id: session.user.id,
          email: session.user.email || "",
          fullName: metadata.full_name || metadata.name || session.user.email?.split("@")[0] || "",
        });
        if (metadata.full_name || metadata.name) {
          setOrganizationName(`${metadata.full_name || metadata.name}'s Organization`);
        }
      }
    };
    getUserInfo();
  }, []);

  const handleContinue = async () => {
    if (!userInfo) {
      error("Error", "Unable to get user information. Please try again.");
      return;
    }

    if (userType === "employer" && !organizationName.trim()) {
      error("Error", "Please enter your organization name");
      return;
    }

    setIsLoading(true);

    try {
      if (userType === "employer") {
        const employerData = await employerMutations.registerEmployer({
          authUserId: userInfo.id,
          fullName: userInfo.fullName,
          email: userInfo.email,
          organizationName: organizationName.trim(),
        });

        queryClient.invalidateQueries();

        success(
          "Welcome!",
          `Your Employer Code: ${employerData.employerCode || "N/A"}\n\nSave this code - employees will use it to join your organization.`,
          () => router.replace("/(hr)")
        );
      } else {
        const { error: insertError } = await supabase.from("users").insert({
          id: userInfo.id,
          email: userInfo.email,
          full_name: userInfo.fullName,
          role: "employee",
          is_active: true,
        });

        if (insertError) throw insertError;

        queryClient.invalidateQueries();

        success(
          "Welcome!",
          "Search for your employer and send a join request to get started.",
          () => router.replace("/(employee)")
        );
      }
    } catch (err: any) {
      console.error("Role selection error:", err);
      error("Error", err?.message || "Failed to complete setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Section */}
      <LinearGradient colors={Gradients.saffronHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSection}>
        <SafeAreaView edges={["top"]} style={styles.heroContent}>
          <View style={styles.celebrationIcon}>
            <MaterialCommunityIcons name="party-popper" size={32} color={Colors.textInverse} />
          </View>
          <Text style={styles.heroTitle}>Almost There!</Text>
          <Text style={styles.heroSubtitle}>One more step to get started</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* User Welcome */}
          {userInfo && (
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.welcomeSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInfo.fullName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.welcomeName}>{userInfo.fullName}</Text>
              <Text style={styles.welcomeEmail}>{userInfo.email}</Text>
            </Animated.View>
          )}

          {/* Role Selection */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.roleSection}>
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

          {/* Organization Name (for employers) */}
          {userType === "employer" && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.inputContainer, orgFocused && styles.inputContainerFocused]}>
              <View style={[styles.inputIcon, orgFocused && styles.inputIconFocused]}>
                <MaterialCommunityIcons name="office-building-outline" size={20} color={orgFocused ? Colors.primary : Colors.gray400} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Organization Name"
                placeholderTextColor={Colors.textTertiary}
                value={organizationName}
                onChangeText={setOrganizationName}
                editable={!isLoading}
                onFocus={() => setOrgFocused(true)}
                onBlur={() => setOrgFocused(false)}
              />
            </Animated.View>
          )}

          {/* Info Box */}
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              {userType === "employer"
                ? "You'll receive a unique code for employees to join your organization."
                : "After setup, search for your employer and send a join request."}
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomCTA}>
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <DepthButton
              onPress={handleContinue}
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              size="lg"
            >
              {isLoading ? "Setting up..." : "Continue"}
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
  celebrationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  welcomeSection: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: "700",
    color: Colors.textInverse,
  },
  welcomeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  welcomeEmail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "08",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.primaryDark,
    lineHeight: 20,
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
