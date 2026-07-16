/**
 * Style-safety helpers.
 *
 * On iOS New Architecture (Fabric), a <View> with a border + borderRadius whose
 * radius / width / height evaluates to NaN, Infinity, or a negative number makes
 * UIKit's -[UIImage resizableImageWithCapInsets:] throw `couldNotInstantiate`,
 * which crashes the app (abort). See RCTBorderDrawing.m:417.
 *
 * Wrap any *computed* borderRadius / dimension with these to guarantee a finite,
 * non-negative value and avoid that native crash.
 */

/** Clamp a computed border radius to a finite, non-negative number. */
export const safeRadius = (n: number): number =>
  Number.isFinite(n) ? Math.max(0, n) : 0;

/** Clamp a computed width/height to a finite, non-negative number. */
export const safeDimension = (n: number): number =>
  Number.isFinite(n) ? Math.max(0, n) : 0;
