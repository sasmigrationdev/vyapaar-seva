# Add Animation

Add smooth, premium animations to a component using React Native Reanimated.

## Instructions

1. **Animation Library**: Use `react-native-reanimated` (already installed)

2. **Common Animation Patterns**:

   ### Press Animation (for buttons/cards)
   ```typescript
   const scale = useSharedValue(1);

   const animatedStyle = useAnimatedStyle(() => ({
     transform: [{ scale: scale.value }],
   }));

   const handlePressIn = () => {
     scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
   };

   const handlePressOut = () => {
     scale.value = withSpring(1, { damping: 15, stiffness: 400 });
   };
   ```

   ### Fade In on Mount
   ```typescript
   const opacity = useSharedValue(0);

   useEffect(() => {
     opacity.value = withTiming(1, { duration: 300 });
   }, []);
   ```

   ### Slide In
   ```typescript
   const translateY = useSharedValue(20);

   useEffect(() => {
     translateY.value = withSpring(0, { damping: 20 });
   }, []);
   ```

   ### Breathing/Pulse (for active states)
   ```typescript
   const scale = useSharedValue(1);

   useEffect(() => {
     scale.value = withRepeat(
       withSequence(
         withTiming(1.02, { duration: 1100 }),
         withTiming(1, { duration: 1100 })
       ),
       -1, // infinite
       true // reverse
     );
   }, []);
   ```

   ### Spring Config Presets
   ```typescript
   const SPRING_CONFIG = {
     gentle: { damping: 20, stiffness: 200 },
     snappy: { damping: 15, stiffness: 400 },
     bouncy: { damping: 10, stiffness: 300 },
   };
   ```

3. **Haptic Feedback** (pair with animations):
   ```typescript
   import * as Haptics from 'expo-haptics';

   // Light tap
   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

   // Success
   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
   ```

4. **Best Practices**:
   - Keep animations subtle (0.98-1.02 scale range)
   - Use spring for natural feel, timing for precise control
   - Add haptics to important interactions
   - Test on device (animations feel different on simulator)

## Target Component

$ARGUMENTS
