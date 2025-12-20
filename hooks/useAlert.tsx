import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import AlertModal, { AlertType, AlertButton, AlertModalProps } from "@/components/ui/AlertModal";
import { Ionicons } from "@expo/vector-icons";

interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  icon?: keyof typeof Ionicons.glyphMap;
}

interface AlertContextType {
  alert: (options: AlertOptions) => void;
  success: (title: string, message?: string, onOk?: () => void) => void;
  error: (title: string, message?: string, onOk?: () => void) => void;
  warning: (title: string, message?: string, onOk?: () => void) => void;
  info: (title: string, message?: string, onOk?: () => void) => void;
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  confirmDestructive: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertState, setAlertState] = useState<Omit<AlertModalProps, "onClose"> & { visible: boolean }>({
    visible: false,
    title: "",
    message: undefined,
    type: "info",
    buttons: [{ text: "OK", style: "default" }],
  });

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type || "info",
      buttons: options.buttons || [{ text: "OK", style: "default" }],
      icon: options.icon,
    });
  }, []);

  const success = useCallback((title: string, message?: string, onOk?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      type: "success",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });
  }, []);

  const error = useCallback((title: string, message?: string, onOk?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      type: "error",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });
  }, []);

  const warning = useCallback((title: string, message?: string, onOk?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      type: "warning",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });
  }, []);

  const info = useCallback((title: string, message?: string, onOk?: () => void) => {
    setAlertState({
      visible: true,
      title,
      message,
      type: "info",
      buttons: [{ text: "OK", style: "default", onPress: onOk }],
    });
  }, []);

  const confirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = "Confirm",
      cancelText: string = "Cancel"
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        type: "confirm",
        buttons: [
          { text: cancelText, style: "cancel", onPress: onCancel },
          { text: confirmText, style: "default", onPress: onConfirm },
        ],
      });
    },
    []
  );

  const confirmDestructive = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = "Delete",
      cancelText: string = "Cancel"
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        type: "error",
        buttons: [
          { text: cancelText, style: "cancel", onPress: onCancel },
          { text: confirmText, style: "destructive", onPress: onConfirm },
        ],
      });
    },
    []
  );

  const contextValue: AlertContextType = {
    alert,
    success,
    error,
    warning,
    info,
    confirm,
    confirmDestructive,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        icon={alertState.icon}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

export default useAlert;
