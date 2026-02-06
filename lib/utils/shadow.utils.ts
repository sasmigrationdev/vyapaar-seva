import { Platform, ViewStyle } from 'react-native';

interface ShadowConfig {
  color?: string;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}

/**
 * Creates platform-specific shadow styles.
 * iOS: Uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * Android: Uses elevation only (colored shadows not supported)
 */
export function createShadow(config: ShadowConfig): ViewStyle {
  const {
    color = '#000',
    offsetY = 4,
    opacity = 0.15,
    radius = 8,
    elevation = 4,
  } = config;

  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: { elevation },
  }) as ViewStyle;
}

/**
 * Creates a colored shadow for iOS, standard elevation for Android.
 * Use this for buttons and cards that need colored shadows on iOS.
 */
export function createColoredShadow(
  color: string,
  elevation: number = 4
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: { elevation },
    default: { elevation },
  }) as ViewStyle;
}

/**
 * Creates a subtle shadow for cards and containers.
 */
export function createCardShadow(elevation: number = 2): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: { elevation },
    default: { elevation },
  }) as ViewStyle;
}
