import type { AgentAccess } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { agentAccess } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

export function readAgentAccess(database: Database): AgentAccess {
  return {
    enabled: database.select().from(agentAccess).get()?.enabled ?? true,
  };
}

export async function setAgentAccess(
  database: Database,
  writer: WriterActorRef,
  enabled: boolean,
): Promise<AgentAccess> {
  await writeDatabaseJobAndWaitForCommit(writer, new AgentAccessJob(enabled));

  return readAgentAccess(database);
}

class AgentAccessJob implements WriterJob {
  public constructor(private readonly enabled: boolean) {}
  public describe(): string {
    return 'change Agent access';
  }
  public commit(transaction: StorageTransaction): void {
    const row = { singleton: 1, enabled: this.enabled };
    transaction
      .insert(agentAccess)
      .values(row)
      .onConflictDoUpdate({ target: agentAccess.singleton, set: row })
      .run();
  }
}
