import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  BorderRadius,
  Shadows,
  Spacing,
  StatusColors,
} from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ConfirmDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType?: string;
  consequences?: string[];
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  visible,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "item",
  consequences,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isConfirmMatch = confirmText.toLowerCase().trim() === itemName.toLowerCase().trim();

  useEffect(() => {
    if (visible) {
      setConfirmText("");
      setStep(1);
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

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    if (isConfirmMatch && !isLoading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {/* Warning Icon */}
              <View style={styles.iconContainer}>
                <Ionicons
                  name="warning"
                  size={32}
                  color={Colors.error}
                />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {step === 1 ? (
                /* Step 1: Show details and consequences */
                <>
                  <View style={styles.detailsContainer}>
                    <View style={styles.itemRow}>
                      <Text style={styles.itemLabel}>{itemType}:</Text>
                      <Text style={styles.itemName}>{itemName}</Text>
                    </View>

                    {consequences && consequences.length > 0 && (
                      <View style={styles.consequencesContainer}>
                        <Text style={styles.consequencesTitle}>
                          This action will:
                        </Text>
                        {consequences.map((consequence, index) => (
                          <View key={index} style={styles.consequenceRow}>
                            <Ionicons
                              name="alert-circle"
                              size={16}
                              color={Colors.error}
                            />
                            <Text style={styles.consequenceText}>
                              {consequence}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.warningBox}>
                      <Ionicons
                        name="information-circle"
                        size={18}
                        color={Colors.warning}
                      />
                      <Text style={styles.warningText}>
                        This action cannot be undone.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={handleClose}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.proceedButton]}
                      onPress={handleProceedToStep2}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.proceedButtonText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* Step 2: Type name to confirm */
                <>
                  <View style={styles.confirmContainer}>
                    <Text style={styles.confirmInstruction}>
                      To confirm, type{" "}
                      <Text style={styles.confirmNameHighlight}>{itemName}</Text>
                      {" "}below:
                    </Text>

                    <TextInput
                      style={[
                        styles.confirmInput,
                        confirmText.length > 0 && (
                          isConfirmMatch
                            ? styles.confirmInputValid
                            : styles.confirmInputInvalid
                        ),
                      ]}
                      value={confirmText}
                      onChangeText={setConfirmText}
                      placeholder={itemName}
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      editable={!isLoading}
                      accessibilityLabel={`Type ${itemName} to confirm deletion`}
                      accessibilityHint="Exact match required to enable delete button"
                    />

                    {confirmText.length > 0 && !isConfirmMatch && (
                      <Text style={styles.mismatchText}>
                        Text doesn't match
                      </Text>
                    )}
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setStep(1)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.deleteButton,
                        (!isConfirmMatch || isLoading) && styles.deleteButtonDisabled,
                      ]}
                      onPress={handleConfirm}
                      disabled={!isConfirmMatch || isLoading}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.deleteButtonText,
                          (!isConfirmMatch || isLoading) && styles.deleteButtonTextDisabled,
                        ]}
                      >
                        {isLoading ? "Removing..." : "Remove"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  modalContainer: {
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
    backgroundColor: StatusColors.rejected.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  detailsContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  consequencesContainer: {
    marginBottom: Spacing.md,
  },
  consequencesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  consequenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  consequenceText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: StatusColors.pending.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: StatusColors.pending.border,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
    color: StatusColors.pending.text,
    flex: 1,
  },
  confirmContainer: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  confirmInstruction: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  confirmNameHighlight: {
    fontWeight: "700",
    color: Colors.text,
  },
  confirmInput: {
    width: "100%",
    height: 48,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.gray50,
  },
  confirmInputValid: {
    borderColor: Colors.success,
    backgroundColor: Colors.background,
  },
  confirmInputInvalid: {
    borderColor: Colors.error,
    backgroundColor: Colors.background,
  },
  mismatchText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.md,
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
  proceedButton: {
    backgroundColor: Colors.warning,
  },
  proceedButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  deleteButtonDisabled: {
    backgroundColor: Colors.gray200,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textInverse,
  },
  deleteButtonTextDisabled: {
    color: Colors.textTertiary,
  },
});
