import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { serverIdentity } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

class ServerIdentityJob implements WriterJob {
  private readonly serverId = randomUUID();

  public describe(): string {
    return 'initialize Server identity';
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .insert(serverIdentity)
      .values({ singleton: 1, serverId: this.serverId })
      .onConflictDoNothing()
      .run();
  }
}

export async function readServerId(
  database: Database,
  writer: WriterActorRef,
): Promise<string> {
  const existing = database.select().from(serverIdentity).get();

  if (existing) return existing.serverId;
  await writeDatabaseJobAndWaitForCommit(writer, new ServerIdentityJob());
  const stored = database.select().from(serverIdentity).get();

  if (!stored) throw new Error('Server identity was not committed');

  return stored.serverId;
}
