import type { Database } from '@repo/db';
import { agentCatalogSyncRequest } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import {
  writeDatabaseJobAndWaitForCommit,
  type AgentCatalogReplaceJob,
  type writerMachine,
} from '../../feed';

export async function writeAgentCatalogThroughWriter(input: {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
  job: AgentCatalogReplaceJob;
}): Promise<string[]> {
  await writeDatabaseJobAndWaitForCommit(input.writer, input.job);
  return (
    input.database
      .select({ changedIds: agentCatalogSyncRequest.changedIds })
      .from(agentCatalogSyncRequest)
      .where(eq(agentCatalogSyncRequest.requestId, input.job.syncId))
      .get()?.changedIds ?? []
  );
}
