import type { Database } from '@repo/db';
import { device } from '@repo/db/schema';
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
    transaction.insert(device).values(this.row).onConflictDoNothing().run();
  }
}

export type ServerDeviceInput = Pick<
  ServerDeviceRow,
  'id' | 'publicKey' | 'name' | 'platform'
> & { now: number };

// The Server Device's row is made with the Server and kept; a restart changes nothing.
export async function ensureServerDevice(
  database: Database,
  writer: WriterActorRef,
  { now, ...fields }: ServerDeviceInput,
): Promise<void> {
  if (database.select().from(device).get()) return;
  await writeDatabaseJobAndWaitForCommit(
    writer,
    new ServerDeviceJob({ ...fields, serverDevice: true, pairedAt: now }),
  );
}
