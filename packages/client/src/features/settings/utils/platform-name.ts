import type { DevicePlatform } from '@repo/contracts';

const platformNames: Record<DevicePlatform, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
};

// What a Device's platform is called in words, on the Devices list and in the question that asks to let one in.
export const platformName = (platform: DevicePlatform): string =>
  platformNames[platform];

// A phone-class Device draws the phone glyph, any other the computer's; the Server says only the platform, so no tablet.
export const platformIcon = (platform: DevicePlatform): 'phone' | 'computer' =>
  platform === 'ios' || platform === 'android' ? 'phone' : 'computer';
