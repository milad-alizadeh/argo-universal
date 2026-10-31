import { DeviceEventEmitter, Dimensions } from 'react-native';
import { fontScaleEvent, fontScaleUpdate } from './font-scale';

/*
 * Takes the font scale the Android Activity hands over and puts it where React Native keeps it. The Activity
 * handles a font-size change itself rather than being recreated (plugins/with-font-scale-config-change.mjs, #1639),
 * and React Native then lays the native text out again without telling JavaScript, so nothing that reads the scale
 * in React — `useWindowDimensions`, `PixelRatio.getFontScale()`, the kit's `useEnlargedText` and `Text`'s
 * font-scale key — hears about it on its own (#1657). Only JavaScript knows the window sizes to keep alongside it,
 * which is why the Activity sends the scale and this writes the metrics.
 */
export function watchFontScale(): void {
  DeviceEventEmitter.addListener(fontScaleEvent, (fontScale: number) => {
    Dimensions.set(
      fontScaleUpdate(
        Dimensions.get('window'),
        Dimensions.get('screen'),
        fontScale,
      ),
    );
  });
}
