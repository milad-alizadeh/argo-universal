import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions } from 'react-native';

/*
 * Android counts a device whose smaller side is under 600 dp as a phone (the sw600dp qualifier,
 * developer.android.com/guide/topics/large-screens/support-different-screen-sizes). The screen's
 * size, not the window's, so a tablet in split view is still a tablet.
 */
const tabletSmallestWidth = 600;

function isPhone(): boolean {
  const { width, height } = Dimensions.get('screen');

  return Math.min(width, height) < tabletSmallestWidth;
}

/*
 * Phones stay in portrait and tablets rotate (ADR-0026, amended 2026-10-18). app.json allows every
 * orientation, so Android tablets before Android 16 rotate too; iPhone's Info.plist also lists
 * portrait only. `lockAsync` takes an `OrientationLock` (expo-screen-orientation's
 * ScreenOrientation.d.ts; docs.expo.dev/versions/latest/sdk/screen-orientation).
 */
export function holdPhonesInPortrait(): void {
  if (!isPhone()) return;

  void ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP,
  );
}
