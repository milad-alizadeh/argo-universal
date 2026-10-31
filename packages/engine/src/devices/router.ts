import { ServerDevice, ServerKey } from '@repo/contracts';
import type { Database } from '@repo/db';
import { device } from '@repo/db/schema';
import { asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, routerFactory, serverDeviceProcedure } from '../rpc';

export type DevicesDeps = { database: Database; serverPublicKey: string };

const iso = (time: number): string => new Date(time).toISOString();

type DeviceRow = typeof device.$inferSelect;

const toServerDevice = (row: DeviceRow): ServerDevice => ({
  ...row,
  pairedAt: iso(row.pairedAt),
  lastSeenAt: row.lastSeenAt === null ? null : iso(row.lastSeenAt),
});

// The Server Device first, then each Paired Device.
const listDevices = (database: Database): ServerDevice[] =>
  database
    .select()
    .from(device)
    .orderBy(desc(device.serverDevice), asc(device.pairedAt))
    .all()
    .map(toServerDevice);

/*
 * Server-Device-only (ADR-0022, ADR-0045): a Paired Device never sees the other Devices, and the Server refuses to tell it rather than trusting the App to hide the page.
 */
export const createDevicesRouter = routerFactory((deps: DevicesDeps) =>
  router({
    list: serverDeviceProcedure
      .output(z.array(ServerDevice))
      .query(() => listDevices(deps.database)),
    serverKey: serverDeviceProcedure
      .output(ServerKey)
      .query(() => ({ publicKey: deps.serverPublicKey })),
  }),
);
