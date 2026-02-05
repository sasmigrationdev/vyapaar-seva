# Create UI Component

Create a new reusable UI component following the Vyapaar Sewa design system.

## Instructions

1. **Read the theme first**: Always check `constants/theme.ts` for colors, spacing, typography, shadows, and gradients before creating any component.

2. **Component Location**:
   - Core UI components → `components/ui/`
   - Domain-specific → `components/[domain]/` (attendance, salary, employee, financial, profile)

3. **Follow the pattern**:
   ```typescript
   import { View, StyleSheet, Pressable } from 'react-native';
   import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
   import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/theme';

   interface ComponentNameProps {
     // Props with TypeScript types
   }

   export function ComponentName({ ...props }: ComponentNameProps) {
     // 1. Animation values (if needed)
     // 2. Handlers
     // 3. Render
     return (
       <View style={styles.container}>
         {/* Content */}
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: {
       // Use theme constants
       padding: Spacing.lg,
       borderRadius: BorderRadius.xl,
       backgroundColor: Colors.background,
       ...Shadows.sm,
     },
   });
   ```

4. **Design Requirements**:
   - Use Indian flag color palette (saffron, green, navy)
   - Apply glassmorphism for hero/overlay cards
   - Include press animations (scale to 0.98)
   - Support dark mode via Colors
   - Minimum touch target: 48x48

5. **Export**: Add the component export to the appropriate index file.

## User Request

$ARGUMENTS
