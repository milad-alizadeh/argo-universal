import type { DevicePlatform, ServerDevice } from '@repo/contracts';

// One Device in the Server Device's list, with its times already said in words.
export interface DeviceRow {
  id: string;
  name: string;
  platform: DevicePlatform;
  // The Server Device's own row: marked, and never offered an unpair.
  serverDevice: boolean;
  seen: string;
}

const platformNames: Record<DevicePlatform, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
};

export const platformName = (platform: DevicePlatform): string =>
  platformNames[platform];

// A Device that spoke in the last few minutes is active; any other is last seen on a day.
const minuteMs = 60_000,
  minutesActive = 5;

const activeWithinMs = minutesActive * minuteMs;

export function seenLabel(lastSeenAt: string | null, now: number): string {
  if (lastSeenAt === null) return 'Never seen';

  const seen = new Date(lastSeenAt);

  if (now - seen.getTime() < activeWithinMs) return 'Active now';

  return `Last seen ${formatDay(seen)}`;
}

export const formatDay = (date: Date): string =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const deviceRow = (device: ServerDevice, now: number): DeviceRow => ({
  id: device.id,
  name: device.name,
  platform: device.platform,
  serverDevice: device.serverDevice,
  seen: seenLabel(device.lastSeenAt, now),
});
