import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Colors,
  BorderRadius,
  Shadows,
  Spacing,
  StatusColors,
} from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const typeConfig: Record<
  AlertType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    iconColor: Colors.success,
    iconBg: StatusColors.approved.background,
  },
  error: {
    icon: "close-circle",
    iconColor: Colors.error,
    iconBg: StatusColors.rejected.background,
  },
  warning: {
    icon: "warning",
    iconColor: Colors.warning,
    iconBg: StatusColors.pending.background,
  },
  info: {
    icon: "information-circle",
    iconColor: Colors.info,
    iconBg: "#DBEAFE", // Info background - using existing value as no StatusColors.info exists
  },
  confirm: {
    icon: "help-circle",
    iconColor: Colors.primary,
    iconBg: "#FFEDD5", // Confirm background - using existing value for primary tint
  },
};

export default function AlertModal({
  visible,
  title,
  message,
  type = "info",
  buttons = [{ text: "OK", style: "default" }],
  onClose,
  icon,
}: AlertModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const config = typeConfig[type];
  const displayIcon = icon || config.icon;

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose();
  };

  const getButtonStyle = (style?: AlertButton["style"], index?: number) => {
    const isLast = index === (buttons.length - 1);

    switch (style) {
      case "cancel":
        return {
          container: [styles.button, styles.cancelButton],
          text: styles.cancelButtonText,
        };
      case "destructive":
        return {
          container: [styles.button, styles.destructiveButton],
          text: styles.destructiveButtonText,
        };
      default:
        // Primary button styling for the last/main action
        if (isLast && buttons.length > 1) {
          return {
            container: [styles.button, styles.primaryButton],
            text: styles.primaryButtonText,
          };
        }
        return {
          container: [styles.button, styles.defaultButton],
          text: styles.defaultButtonText,
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.alertContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                <Ionicons
                  name={displayIcon}
                  size={32}
                  color={config.iconColor}
                />
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                {message && <Text style={styles.message}>{message}</Text>}
              </View>

              {/* Buttons */}
              <View style={[
                styles.buttonContainer,
                buttons.length === 1 && styles.singleButtonContainer
              ]}>
                {buttons.map((button, index) => {
                  const buttonStyle = getButtonStyle(button.style, index);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={buttonStyle.container}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.8}
                      accessibilityLabel={button.text}
                      accessibilityRole="button"
                      accessibilityHint={button.style === 'destructive' ? 'This action cannot be undone' : undefined}
                    >
                      <Text style={buttonStyle.text}>{button.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Hook for easy usage
export interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
}

export const createAlertState = (): AlertState => ({
  visible: false,
  title: "",
  message: undefined,
  type: "info",
  buttons: [{ text: "OK", style: "default" }],
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  alertContainer: {
    width: "100%",
    maxWidth: SCREEN_WIDTH - 48,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius["2xl"],
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    ...Shadows.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  content: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.md,
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  defaultButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  defaultButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  cancelButton: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  destructiveButton: {
    backgroundColor: StatusColors.rejected.background,
    borderWidth: 1,
    borderColor: StatusColors.rejected.border,
  },
  destructiveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.error,
  },
});
