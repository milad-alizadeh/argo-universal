import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
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
  return input.database
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogSyncedAt, input.job.syncedAt))
    .all()
    .map(({ id }) => id);
}
