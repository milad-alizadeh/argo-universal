import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

type CatalogTransaction = Pick<Database, 'select' | 'update' | 'insert'>;
export type AgentCatalogWriteRow = Pick<
  typeof agents.$inferInsert,
  | 'id'
  | 'registryId'
  | 'registryMetadata'
  | 'catalogPresent'
  | 'catalogSyncedAt'
  | 'catalogSearchText'
>;
export type AgentCatalogReplaceJob = {
  type: 'agentCatalogReplace';
  rows: readonly AgentCatalogWriteRow[];
  syncedAt: number;
  syncId: string;
  rejectedValues: number;
};

export function replaceAgentCatalogRows(
  transaction: CatalogTransaction,
  job: AgentCatalogReplaceJob,
): string[] {
  const previousIds = readPresentAgentIds(transaction);
  transaction
    .update(agents)
    .set({ catalogPresent: false, catalogSyncedAt: job.syncedAt })
    .where(eq(agents.catalogPresent, true))
    .run();
  for (const row of job.rows) upsertAgentCatalogRow(transaction, row);
  return [...new Set([...previousIds, ...readPresentAgentIds(transaction)])];
}

function readPresentAgentIds(transaction: Pick<Database, 'select'>): string[] {
  return transaction
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.catalogPresent, true))
    .all()
    .map(({ id }) => id);
}

function upsertAgentCatalogRow(
  transaction: Pick<Database, 'insert'>,
  row: AgentCatalogWriteRow,
): void {
  transaction
    .insert(agents)
    .values(row)
    .onConflictDoUpdate({
      target: agents.registryId,
      set: {
        registryMetadata: row.registryMetadata,
        catalogPresent: row.catalogPresent,
        catalogSyncedAt: row.catalogSyncedAt,
        catalogSearchText: row.catalogSearchText,
      },
    })
    .run();
}
