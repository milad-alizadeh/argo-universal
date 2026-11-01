import { ServerDevice, ServerKey } from '@repo/contracts';
import type { Database } from '@repo/db';
import { device } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import {
  publicProcedure,
  router,
  routerFactory,
  serverDeviceProcedure,
} from '../rpc';
import type { RpcIdentity } from '../rpc/identity';
import type { WriterActorRef } from '../storage';
import type { OpenChannels } from './open-channels';
import { readDeviceById, unpairDevice } from './paired-device';

export type DevicesDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  serverPublicKey: string;
  channels: OpenChannels;
};

// Long enough for the answer to "unpair me" to reach the Device that asked, short enough that it is never left holding a channel the Server has stopped trusting.
const selfUnpairGraceMs = 100;

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

function refuseServerDevice(): never {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'The Server Device cannot be unpaired',
  });
}

/*
 * Deleting the row is the unpair: the Device's key is a stranger's from the next handshake, so its next call is refused. Ending its open channels is what makes that true mid-Session as well.
 */
async function unpair(deps: DevicesDeps, deviceId: string): Promise<void> {
  const row = readDeviceById(deps.database, deviceId);

  if (!row)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No such Device' });

  if (row.serverDevice) refuseServerDevice();

  await unpairDevice(deps.databaseWriter, deviceId);
  deps.channels.closeAll(deviceId);
}

// A Paired Device unpairs only itself; the channel that carried the question closes just after the answer has gone out on it.
async function unpairSelf(
  deps: DevicesDeps,
  identity: RpcIdentity,
): Promise<void> {
  if (identity.serverDevice) return refuseServerDevice();

  const { deviceId } = identity;

  await unpairDevice(deps.databaseWriter, deviceId);
  setTimeout(() => deps.channels.closeAll(deviceId), selfUnpairGraceMs);
}

const unpairProcedure = serverDeviceProcedure
  .input(z.strictObject({ deviceId: z.string() }))
  .output(z.void());

const unpairSelfProcedure = publicProcedure.output(z.void());

/*
 * Server-Device-only (ADR-0022, ADR-0045): a Paired Device never sees the other Devices, and the Server refuses to tell it rather than trusting the App to hide the page.
 * The one exception is `unpairSelf`: a Paired Device may leave, and the identity the handshake proved is the only Device it can name, so it can never unpair another.
 */
export const createDevicesRouter = routerFactory((deps: DevicesDeps) =>
  router({
    list: serverDeviceProcedure
      .output(z.array(ServerDevice))
      .query(() => listDevices(deps.database)),
    serverKey: serverDeviceProcedure
      .output(ServerKey)
      .query(() => ({ publicKey: deps.serverPublicKey })),
    unpair: unpairProcedure.mutation(({ input }) =>
      unpair(deps, input.deviceId),
    ),
    unpairSelf: unpairSelfProcedure.mutation(({ ctx }) =>
      unpairSelf(deps, ctx.identity),
    ),
  }),
);
