import { Text, TextProps } from 'react-native';
import { FontFamily } from '@/constants/theme';

/**
 * Global font setup for the app
 * This patches the default Text component to use Funnel Sans font
 */

// Store the original render method
const originalRender = (Text as any).render;

// Override the render method to apply font family based on font weight
(Text as any).render = function (props: TextProps, ref: any) {
  // Get the style
  const style = props.style || {};
  const styleArray = Array.isArray(style) ? style : [style];

  // Find fontWeight in the styles
  let fontWeight: any = undefined;
  for (const s of styleArray) {
    if (s && typeof s === 'object' && 'fontWeight' in s) {
      fontWeight = s.fontWeight;
    }
  }

  // Map fontWeight to appropriate Funnel Sans font family
  let fontFamily = FontFamily.regular;

  if (fontWeight) {
    switch (String(fontWeight)) {
      case '300':
      case 'light':
        fontFamily = FontFamily.regular;
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

  // Add the font family to the style
  const newStyle = [...styleArray, { fontFamily }];

  // Call the original render with modified props
  return originalRender.call(this, { ...props, style: newStyle }, ref);
};

export {};
