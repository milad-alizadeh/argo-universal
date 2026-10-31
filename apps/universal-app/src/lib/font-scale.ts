import type { DimensionsPayload, DisplayMetrics } from 'react-native';

/*
 * The name the Android Activity sends a new font scale under. The Activity handles a font-size change itself
 * rather than being recreated (plugins/with-font-scale-config-change.mjs, #1639), and React Native then lays the
 * native text out again without telling JavaScript: `DeviceInfoModule.onHostResume` is the only place that raises
 * `didUpdateDimensions` with a new scale on Android, and the recreated Activity used to run it. So `Dimensions`,
 * `useWindowDimensions().fontScale`, `PixelRatio.getFontScale()`, the kit's `useEnlargedText` and the kit `Text`'s
 * font-scale key all keep the old scale until the App is relaunched (#1657). The Activity sends the scale, since
 * only it can read it; JavaScript holds the window sizes to keep alongside it, so JavaScript writes the metrics.
 */
export const fontScaleEvent = 'argoFontScaleChange';

// What `Dimensions` holds: the window and the screen it sits on.
export type Metrics = { window: DisplayMetrics; screen: DisplayMetrics };

/*
 * What `Dimensions` should now say: the scale the person has just chosen, against the sizes it already holds, since
 * only the text grew. Nothing, when the scale is the one it already reports: the Activity answers every
 * configuration change it handles, and a theme or rotation change must not redraw everything that reads the window.
 */
export function fontScaleUpdate(
  metrics: Metrics,
  fontScale: number,
): DimensionsPayload | undefined {
  if (metrics.window.fontScale === fontScale) return undefined;

  return {
    window: { ...metrics.window, fontScale },
    screen: { ...metrics.screen, fontScale },
  };
}

// Where a font scale arrives from and where it has to be reported; React Native supplies both on a phone.
export type FontScaleDevice = {
  onFontScale: (listener: (fontScale: number) => void) => void;
  metrics: () => Metrics;
  report: (update: DimensionsPayload) => void;
};

// Takes the font scale the Android Activity hands over and puts it where React Native keeps it.
export function watchFontScaleOn(device: FontScaleDevice): void {
  device.onFontScale((fontScale) => {
    const update = fontScaleUpdate(device.metrics(), fontScale);

    if (update) device.report(update);
  });
}
