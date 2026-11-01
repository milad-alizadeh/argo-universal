import { z } from 'zod';

// What a Device runs, as its own platform reports it. One spelling, so a row, a claim and a registration cannot disagree.
export const DevicePlatform = z.enum([
  'macos',
  'windows',
  'linux',
  'ios',
  'android',
]);

export type DevicePlatform = z.infer<typeof DevicePlatform>;

// One row of the Server's Devices list. Only public keys ever appear here.
export const ServerDevice = z.strictObject({
  id: z.string(),
  publicKey: z.string(),
  name: z.string(),
  platform: DevicePlatform,
  serverDevice: z.boolean(),
  pairedAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime().nullable(),
});

export type ServerDevice = z.infer<typeof ServerDevice>;

// Output of `devices.serverKey`: what the QR carries so a Device can recognise its Server.
export const ServerKey = z.strictObject({ publicKey: z.string() });

export type ServerKey = z.infer<typeof ServerKey>;
