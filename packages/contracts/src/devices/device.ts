import { z } from 'zod';

// One row of the Server's Devices list. Only public keys ever appear here.
export const ServerDevice = z.strictObject({
  id: z.string(),
  publicKey: z.string(),
  name: z.string(),
  platform: z.enum(['macos', 'windows', 'linux', 'ios', 'android']),
  serverDevice: z.boolean(),
  pairedAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime().nullable(),
});

export type ServerDevice = z.infer<typeof ServerDevice>;

// Output of `devices.serverKey`: what the QR carries so a Device can recognise its Server.
export const ServerKey = z.strictObject({ publicKey: z.string() });

export type ServerKey = z.infer<typeof ServerKey>;
