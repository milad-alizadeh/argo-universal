import type { PairingClaim } from '@repo/contracts';
import type { Database } from '@repo/db';
import { device } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

type DeviceRow = typeof device.$inferInsert;

class PairedDeviceJob implements WriterJob {
  public constructor(private readonly row: DeviceRow) {}

  public describe(): string {
    return 'record a paired Device';
  }

  public commit(transaction: StorageTransaction): void {
    transaction.insert(device).values(this.row).run();
  }
}

class LastSeenJob implements WriterJob {
  public constructor(
    private readonly id: string,
    private readonly now: number,
  ) {}

  public describe(): string {
    return 'follow when a Device was last seen';
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(device)
      .set({ lastSeenAt: this.now })
      .where(eq(device.id, this.id))
      .run();
  }
}

class UnpairJob implements WriterJob {
  public constructor(private readonly id: string) {}

  public describe(): string {
    return 'unpair a Device';
  }

  // The Server Device's own row is never deleted here, whichever id is named.
  public commit(transaction: StorageTransaction): void {
    transaction
      .delete(device)
      .where(and(eq(device.id, this.id), eq(device.serverDevice, false)))
      .run();
  }
}

export const readDeviceById = (
  database: Database,
  id: string,
): DeviceRow | undefined =>
  database.select().from(device).where(eq(device.id, id)).get();

export const readDeviceByPublicKey = (
  database: Database,
  publicKey: string,
): DeviceRow | undefined =>
  database.select().from(device).where(eq(device.publicKey, publicKey)).get();

export interface PairedDeviceInput {
  readonly id: string;
  readonly publicKey: string;
  readonly claim: PairingClaim;
  readonly now: number;
}

const pairedRow = (input: PairedDeviceInput): DeviceRow => ({
  id: input.id,
  publicKey: input.publicKey,
  name: input.claim.name,
  platform: input.claim.platform,
  pairedAt: input.now,
  lastSeenAt: input.now,
});

// One row per Device, holding the public half of its Device Key, so unpairing it later is that one row deleted (ADR-0045).
export const recordPairedDevice = (
  writer: WriterActorRef,
  input: PairedDeviceInput,
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(
    writer,
    new PairedDeviceJob(pairedRow(input)),
  );

export const followLastSeen = (
  writer: WriterActorRef,
  id: string,
  now: number,
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(writer, new LastSeenJob(id, now));

// Unpairing is that one row deleted (ADR-0045): the Device Key it held is a stranger's from the next handshake on.
export const unpairDevice = (
  writer: WriterActorRef,
  id: string,
): Promise<void> => writeDatabaseJobAndWaitForCommit(writer, new UnpairJob(id));
