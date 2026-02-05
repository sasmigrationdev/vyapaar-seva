# Create New Screen

Create a new screen following Vyapaar Sewa's patterns and design system.

## Instructions

1. **Determine screen location**:
   - Auth screens → `app/auth/`
   - Employee screens → `app/(employee)/`
   - HR screens → `app/(hr)/`
   - Shared modals → `app/modals/`

2. **Screen Template**:
   ```typescript
   import { View, ScrollView, StyleSheet } from 'react-native';
   import { SafeAreaView } from 'react-native-safe-area-context';
   import Animated, { FadeIn } from 'react-native-reanimated';
   import { Stack } from 'expo-router';
   import { Colors, Spacing, Typography } from '@/constants/theme';
   import { Text } from '@/components/ui/Text';
   import { GradientHeader } from '@/components/ui/GradientHeader';

   export default function ScreenName() {
     // 1. Hooks (auth, queries, mutations)
     // 2. Local state
     // 3. Handlers
     // 4. Loading/error states

     return (
       <SafeAreaView style={styles.container} edges={['top']}>
         <Stack.Screen options={{ headerShown: false }} />

         {/* Hero Section */}
         <GradientHeader
           title="Screen Title"
           subtitle="Optional subtitle"
           showBack
         />

         {/* Content */}
         <Animated.ScrollView
           entering={FadeIn.delay(100)}
           style={styles.content}
           contentContainerStyle={styles.contentContainer}
         >
           {/* Screen content */}
         </Animated.ScrollView>
       </SafeAreaView>
     );
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       backgroundColor: Colors.background,
     },
     content: {
       flex: 1,
     },
     contentContainer: {
       padding: Spacing.lg,
       gap: Spacing.lg,
     },
   });
   ```

3. **Screen Patterns by Type**:

   ### List Screen
   - FlatList with pull-to-refresh
   - Search/filter header (sticky)
   - Empty state component
   - Skeleton loading

   ### Detail Screen
   - GradientHeader with back button
   - Info cards with icons
   - Action buttons at bottom
   - Share/edit actions in header

   ### Form Screen
   - Keyboard-aware scroll view
   - Grouped input sections
   - Validation feedback
   - Submit button (sticky or bottom)

   ### Dashboard Screen
   - Hero with key metric
   - Quick actions grid
   - Collapsible sections
   - Pull-to-refresh

4. **Required Exports**: Expo Router uses file-based routing, so the default export is the screen.

5. **Navigation**: Use `router.push()`, `router.back()`, `router.replace()` from `expo-router`.

## Screen to Create

$ARGUMENTS
