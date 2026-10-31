import type { KeepRunning } from '@repo/contracts';
import type { Database } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

export interface KeepRunningDeps {
  database: Database;
  databaseWriter: WriterActorRef;
}

export function readKeepRunning(database: Database): KeepRunning {
  const row = database.select().from(serverSettings).get();

  return { enabled: row?.keepRunningAfterQuit ?? false };
}

export async function setKeepRunning(
  deps: KeepRunningDeps,
  enabled: boolean,
): Promise<KeepRunning> {
  await writeDatabaseJobAndWaitForCommit(
    deps.databaseWriter,
    new KeepRunningJob(enabled),
  );

  return readKeepRunning(deps.database);
}

class KeepRunningJob implements WriterJob {
  public constructor(private readonly enabled: boolean) {}

  public describe(): string {
    return 'change keep running after quit';
  }

  public commit(transaction: StorageTransaction): void {
    const row = { singleton: 1, keepRunningAfterQuit: this.enabled };
    transaction
      .insert(serverSettings)
      .values(row)
      .onConflictDoUpdate({ target: serverSettings.singleton, set: row })
      .run();
  }
}
