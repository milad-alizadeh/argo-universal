import { agents, syncJobs } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../storage';

export type AgentCatalogWriteRow = Pick<
  typeof agents.$inferInsert,
  | 'id'
  | 'registryId'
  | 'registryMetadata'
  | 'catalogPresent'
  | 'catalogSyncedAt'
  | 'catalogSearchText'
>;
type SyncKey = { source: string; scope: string };
type CatalogReplacement = SyncKey & {
  rows: readonly AgentCatalogWriteRow[];
  syncedAt: number;
  rejectedValues: number;
};
type SyncJobChange = SyncKey & {
  set: Pick<typeof syncJobs.$inferInsert, 'status'> &
    Partial<Omit<typeof syncJobs.$inferInsert, 'source' | 'scope'>>;
};
type AgentConfiguration = Pick<
  typeof agents.$inferInsert,
  'id' | 'configuration' | 'enabled'
>;

// A Registry row updates only its catalog columns, never the person's configuration.
const catalogColumns = (
  row: AgentCatalogWriteRow,
): Partial<AgentCatalogWriteRow> => ({
  registryMetadata: row.registryMetadata,
  catalogPresent: row.catalogPresent,
  catalogSyncedAt: row.catalogSyncedAt,
  catalogSearchText: row.catalogSearchText,
});

const upsertAgentCatalogRow = (
  transaction: StorageTransaction,
  row: AgentCatalogWriteRow,
): void => {
  transaction
    .insert(agents)
    .values(row)
    .onConflictDoUpdate({ target: agents.registryId, set: catalogColumns(row) })
    .run();
};

// Replaces the Registry's Agent rows and completes their sync job in one commit.
export class AgentCatalogReplaceJob implements WriterJob {
  public constructor(private readonly replacement: CatalogReplacement) {}

  public describe(): string {
    return `replace catalog with ${this.replacement.rows.length} accepted Agent rows`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .update(agents)
      .set({
        catalogPresent: false,
        catalogSyncedAt: this.replacement.syncedAt,
      })
      .where(eq(agents.catalogPresent, true))
      .run();
    for (const row of this.replacement.rows)
      upsertAgentCatalogRow(transaction, row);
    this.completeSyncJob(transaction);
  }

  private completeSyncJob(transaction: StorageTransaction): void {
    const { source, scope, syncedAt, rejectedValues } = this.replacement;
    transaction
      .update(syncJobs)
      .set({
        status: 'idle',
        completedAt: syncedAt,
        fetchedAt: syncedAt,
        error: null,
        rejectedValues,
      })
      .where(and(eq(syncJobs.source, source), eq(syncJobs.scope, scope)))
      .run();
  }
}

export class SyncJobUpdateJob implements WriterJob {
  public constructor(private readonly change: SyncJobChange) {}

  public describe(): string {
    return `update sync job ${this.change.source}/${this.change.scope}`;
  }

  public commit(transaction: StorageTransaction): void {
    const { source, scope, set } = this.change;
    transaction
      .insert(syncJobs)
      .values({ source, scope, requestedAt: 0, ...set })
      .onConflictDoUpdate({ target: [syncJobs.source, syncJobs.scope], set })
      .run();
  }
}

export class AgentConfigurationSaveJob implements WriterJob {
  public constructor(private readonly agent: AgentConfiguration) {}

  public describe(): string {
    return `save Agent configuration ${this.agent.id}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .insert(agents)
      .values(this.agent)
      .onConflictDoUpdate({
        target: agents.id,
        set: {
          configuration: this.agent.configuration,
          enabled: this.agent.enabled,
        },
      })
      .run();
  }
}

// The jobs whose commit can change what the Agent catalog shows.
export const changesAgentCatalog = (job: WriterJob): boolean =>
  job instanceof AgentCatalogReplaceJob ||
  job instanceof SyncJobUpdateJob ||
  job instanceof AgentConfigurationSaveJob;
