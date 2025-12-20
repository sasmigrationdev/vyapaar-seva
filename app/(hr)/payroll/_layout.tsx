import { Stack } from "expo-router";
import { Colors, Typography } from "@/constants/theme";

export default function PayrollLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontSize: Typography.fontSize.xl,
          fontWeight: Typography.fontWeight.bold,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Payroll Management",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Payroll Period",
          headerShown: true,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Payroll Period Details",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
