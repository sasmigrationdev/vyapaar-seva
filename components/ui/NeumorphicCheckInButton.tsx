import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface NeumorphicCheckInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  isCheckedIn?: boolean;
  size?: number;
}

export function NeumorphicCheckInButton({
  onPress,
  disabled = false,
  loading = false,
  isCheckedIn = false,
  // size = 380,
}: NeumorphicCheckInButtonProps) {
  const animation = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.timing(animation, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.timing(animation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  // Press animation - button sinks
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  // Shadow decreases when pressed
  const shadowOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.1],
  });
  const size = 240;
  const buttonColor = isCheckedIn ? '#EF4444' : Colors.primary;
  const iconName = isCheckedIn ? 'exit-outline' : 'finger-print';
  const buttonText = isCheckedIn ? 'CHECK OUT' : 'CHECK IN';

  return (
    <View style={styles.container}>
      {/* Drop shadow layer - stays in place */}
      <View
        style={[
          styles.dropShadow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />

      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        <Animated.View
          style={[
            styles.outerCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ translateY }, { scale }],
              shadowOpacity,
            },
            disabled && styles.disabledOuter,
          ]}
        >
          {/* Inner white circle */}
          <View
            style={[
              styles.innerCircle,
              {
                width: size - 16,
                height: size - 16,
                borderRadius: (size - 16) / 2,
              },
              disabled && styles.disabledInner,
            ]}
          >
            {/* Content */}
            <View style={styles.content}>
              {loading ? (
                <ActivityIndicator size="large" color={buttonColor} />
              ) : (
                <>
                  <Ionicons
                    name={iconName}
                    size={40}
                    color={disabled ? Colors.gray400 : buttonColor}
                  />
                  <Text
                    style={[
                      styles.buttonText,
                      { color: disabled ? Colors.gray400 : buttonColor },
                    ]}
                  >
                    {buttonText}
                  </Text>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  dropShadow: {
    position: 'absolute',
    backgroundColor: '#D4D7DC',
    top: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#9CA3AF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  outerCircle: {
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4D7DC',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        shadowOpacity: 0.15,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  disabledOuter: {
    backgroundColor: '#E5E7EB',
  },
  innerCircle: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledInner: {
    backgroundColor: '#F9FAFB',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
