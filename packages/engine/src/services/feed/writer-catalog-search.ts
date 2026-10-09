import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';

export type AgentCatalogSearchProjectionJob = {
  type: 'agentCatalogSearchProjection';
  rows: readonly { id: string; expectedRegistryMetadata: string; catalogSearchText: string }[];
};

export function populateAgentCatalogSearchRows(
  transaction: Pick<Database, 'update'>,
  job: AgentCatalogSearchProjectionJob,
): void {
  for (const row of job.rows) transaction.update(agents).set({ catalogSearchText: row.catalogSearchText })
    .where(and(eq(agents.id, row.id), eq(agents.registryMetadata, row.expectedRegistryMetadata),
      eq(agents.catalogSearchText, ''))).run();
}
