import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { FontFamily } from '@/constants/theme';

/**
 * Custom Text component that applies Funnel Sans font by default
 * Automatically maps fontWeight to appropriate Funnel Sans font family
 */
export function Text({ style, ...props }: TextProps) {
  // Extract fontWeight from style if present
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle;
  const fontWeight = flattenedStyle?.fontWeight;

  // Map fontWeight to appropriate Funnel Sans font family
  let fontFamily = FontFamily.regular;

  if (fontWeight) {
    switch (fontWeight) {
      case '300':
      case 'light':
        fontFamily = FontFamily.regular; // Use regular for light weight
        break;
      case '400':
      case 'normal':
        fontFamily = FontFamily.regular;
        break;
      case '500':
      case 'medium':
        fontFamily = FontFamily.medium;
        break;
      case '600':
      case 'semibold':
        fontFamily = FontFamily.semibold;
        break;
      case '700':
      case 'bold':
        fontFamily = FontFamily.bold;
        break;
      case '800':
      case 'extrabold':
        fontFamily = FontFamily.extrabold;
        break;
      default:
        fontFamily = FontFamily.regular;
    }
  }

  // Create new style with fontFamily and without fontWeight
  const { fontWeight: _, ...restStyle } = flattenedStyle || {};
  const newStyle = [
    styles.defaultFont,
    restStyle,
    { fontFamily },
  ];

  return <RNText style={newStyle} {...props} />;
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: FontFamily.regular,
  },
});
