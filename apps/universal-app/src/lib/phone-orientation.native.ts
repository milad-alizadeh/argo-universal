import * as ScreenOrientation from 'expo-screen-orientation';
import { AppState, Dimensions } from 'react-native';
import {
  holdPhonesInPortraitOn,
  type OrientationDevice,
} from './phone-orientation-hold';

/*
 * `lockAsync` takes an `OrientationLock` (expo-screen-orientation's ScreenOrientation.d.ts;
 * docs.expo.dev/versions/latest/sdk/screen-orientation). app.json allows every orientation, so
 * Android tablets before Android 16 rotate too; iPhone's Info.plist also lists portrait only.
 */
const reactNative: OrientationDevice = {
  smallestSide: () => {
    const { width, height } = Dimensions.get('screen');

    return Math.min(width, height);
  },
  lockPortrait: () => {
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  },
  onForeground: (listener) => {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') listener();
    });
  },
};

export function holdPhonesInPortrait(): void {
  holdPhonesInPortraitOn(reactNative);
}
