/*
 * Android counts a device whose smaller side is under 600 dp as a phone (the sw600dp qualifier,
 * developer.android.com/guide/topics/large-screens/support-different-screen-sizes). The screen's
 * size, not the window's, so a tablet in split view is still a tablet.
 */
const tabletSmallestWidth = 600;

// What the lock needs from the device; React Native and expo-screen-orientation supply it on a phone.
export type OrientationDevice = {
  smallestSide: () => number;
  lockPortrait: () => void;
  // Calls the listener each time the App comes to the foreground.
  onForeground: (listener: () => void) => void;
};

/*
 * Phones stay in portrait and tablets rotate (ADR-0026, amended 2026-10-18). `lockAsync` sets
 * `requestedOrientation` on the Activity that exists at that moment, and Android makes a new Activity
 * when the App is reopened into a process that is still alive, so the lock is taken again whenever the
 * App comes to the foreground (#1656).
 */
export function holdPhonesInPortraitOn(device: OrientationDevice): void {
  if (device.smallestSide() >= tabletSmallestWidth) return;

  device.lockPortrait();
  device.onForeground(device.lockPortrait);
}
