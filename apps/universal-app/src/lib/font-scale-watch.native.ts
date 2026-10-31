import { DeviceEventEmitter, Dimensions } from 'react-native';
import { fontScaleEvent, fontScaleUpdate } from './font-scale';

// Takes the font scale the Android Activity hands over and puts it where React Native keeps it (font-scale.ts).
export function watchFontScale(): void {
  DeviceEventEmitter.addListener(fontScaleEvent, (fontScale: number) => {
    const metrics = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };

    const update = fontScaleUpdate(metrics, fontScale);

    if (update) Dimensions.set(update);
  });
}
