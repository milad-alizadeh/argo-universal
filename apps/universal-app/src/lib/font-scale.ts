import type { DimensionsPayload, DisplayMetrics } from 'react-native';

/*
 * The name the Activity sends a new Android font scale under, kept beside the plugin that writes the Kotlin
 * (plugins/with-font-scale-config-change.mjs), whose test holds the two to the same name.
 */
export const fontScaleEvent = 'argoFontScaleChange';

/*
 * What `Dimensions` should now say: the scale the person has just chosen, against the sizes it already holds. Only
 * the text grew, and on Android the font scale is the one part of the metrics that a configuration change the
 * Activity handles leaves React Native unable to re-read (#1657).
 */
export function fontScaleUpdate(
  window: DisplayMetrics,
  screen: DisplayMetrics,
  fontScale: number,
): DimensionsPayload {
  return {
    window: { ...window, fontScale },
    screen: { ...screen, fontScale },
  };
}
