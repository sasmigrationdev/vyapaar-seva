import type { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function EmployeeLayout() {
  const insets = useSafeAreaInsets();
  // Force light theme to match iOS appearance
  const isDark = false;

  const TabIconContainer = ({ focused, children }: { focused: boolean; children: ReactNode }) => (
    <View
      style={[
        styles.tabIconContainer,
        focused && {
          backgroundColor: isDark ? 'rgba(255, 153, 51, 0.22)' : 'rgba(255, 153, 51, 0.15)',
          shadowColor: 'rgba(255, 153, 51, 0.35)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: Platform.OS === 'ios' ? 0.2 : 0,
          shadowRadius: 12,
          elevation: Platform.OS === 'android' ? 6 : 0,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.65)' : Colors.gray400,
        tabBarStyle: {
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing['xs'],
          paddingTop: Spacing['xs'],
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : Colors.border,
        },
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.semibold,
          marginTop: 2,
          letterSpacing: 0.25,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
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
          tabBarIcon: ({ focused }) => (
            <TabIconContainer focused={focused}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? Colors.primary : Colors.gray400}
              />
            </TabIconContainer>
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIconContainer focused={focused}>
              <MaterialCommunityIcons
                name={focused ? 'calendar-clock' : 'calendar-clock-outline'}
                size={26}
                color={focused ? Colors.primary : Colors.gray400}
              />
            </TabIconContainer>
          ),
        }}
      />
      <Tabs.Screen
        name="salary"
        options={{
          title: 'Salary',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIconContainer focused={focused}>
              <MaterialCommunityIcons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={26}
                color={focused ? Colors.primary : Colors.gray400}
              />
            </TabIconContainer>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIconContainer focused={focused}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={focused ? Colors.primary : Colors.gray400}
              />
            </TabIconContainer>
          ),
        }}
      />
      {/* Hide these screens from bottom tabs */}
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
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search-employer"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="employment-history"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="change-employer"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
    borderRadius: BorderRadius.full,
  },
});
