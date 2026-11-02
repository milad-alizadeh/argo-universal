import type { Database } from '@repo/db';
import { device } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

type ServerDeviceRow = typeof device.$inferInsert;

class ServerDeviceJob implements WriterJob {
  public constructor(private readonly row: ServerDeviceRow) {}

  public describe(): string {
    return 'record the Server Device';
  }

  public commit(transaction: StorageTransaction): void {
    transaction.insert(device).values(this.row).run();
  }
}

class ServerDeviceKeyJob implements WriterJob {
  public constructor(private readonly publicKey: string) {}

  public describe(): string {
    return 'follow the Server static key';
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(device)
      .set({ publicKey: this.publicKey })
      .where(eq(device.serverDevice, true))
      .run();
  }
}

export type ServerDeviceInput = Pick<
  ServerDeviceRow,
  'publicKey' | 'name' | 'platform'
> & {
  createId: () => string;
  now: number;
};

const readServerDevice = (database: Database): ServerDeviceRow | undefined =>
  database.select().from(device).where(eq(device.serverDevice, true)).get();

const newRow = ({
  createId,
  now,
  ...fields
}: ServerDeviceInput): ServerDeviceRow => ({
  ...fields,
  id: createId(),
  serverDevice: true,
  pairedAt: now,
});

function jobFor(
  existing: ServerDeviceRow | undefined,
  input: ServerDeviceInput,
): WriterJob | undefined {
  if (!existing) return new ServerDeviceJob(newRow(input));

  return existing.publicKey === input.publicKey
    ? undefined
    : new ServerDeviceKeyJob(input.publicKey);
}

// The Server Device's row is made with the Server and kept; its public key follows server.key.
export async function ensureServerDevice(
  database: Database,
  writer: WriterActorRef,
  input: ServerDeviceInput,
): Promise<void> {
  const job = jobFor(readServerDevice(database), input);

  if (job) await writeDatabaseJobAndWaitForCommit(writer, job);
}
