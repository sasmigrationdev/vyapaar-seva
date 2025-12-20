import { Stack } from 'expo-router';

export default function EmployeeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
