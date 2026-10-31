import { DeviceEventEmitter, Dimensions } from 'react-native';
import {
  fontScaleEvent,
  watchFontScaleOn,
  type FontScaleDevice,
} from './font-scale';

// React Native's side of the hand-over; what it carries, and why, is in font-scale.ts.
const reactNative: FontScaleDevice = {
  onFontScale: (listener) => {
    DeviceEventEmitter.addListener(fontScaleEvent, listener);
  },
  metrics: () => ({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  }),
  report: (update) => Dimensions.set(update),
};

export function watchFontScale(): void {
  watchFontScaleOn(reactNative);
}
