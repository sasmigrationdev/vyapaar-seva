import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AnimatedTabBar from '@/components/ui/AnimatedTabBar';

export default function HRLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.65)' : Colors.gray400,
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? '#0F172A' : '#EEF2FF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontSize: Typography.fontSize.xl,
          fontWeight: Typography.fontWeight.bold,
          color: Colors.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Team',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-group' : 'account-group-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-clock' : 'calendar-clock-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="financial"
        options={{
          title: 'Cashbook',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'book-open-page-variant' : 'book-open-page-variant-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="breaks"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="join-requests"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="employee"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="break-requests"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wifi-networks"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

