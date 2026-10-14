import { AgentConfiguration as SavedConfiguration } from '@repo/contracts';
import { agents, syncJobs } from '@repo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
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
// A check's saved result; null clears it, so the Agent shows Checking… again.
export type SavedReadiness = Pick<
  typeof agents.$inferInsert,
  'readinessStatus' | 'readinessReason' | 'readinessCheckedAt'
>;
export const pendingReadiness: SavedReadiness = {
  readinessStatus: null,
  readinessReason: null,
  readinessCheckedAt: null,
};

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
  public constructor(
    private readonly agent: AgentConfiguration,
    private readonly readiness?: SavedReadiness,
  ) {}

  public describe(): string {
    return `save Agent configuration ${this.agent.id}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .insert(agents)
      .values({ ...this.agent, ...this.readiness })
      .onConflictDoUpdate({
        target: agents.id,
        set: {
          configuration: this.agent.configuration,
          enabled: this.agent.enabled,
          ...this.readiness,
        },
      })
      .run();
  }
}

// Saves Readiness on existing rows only; a removed Agent's row is never recreated.
export class AgentReadinessSaveJob implements WriterJob {
  public constructor(
    private readonly agentIds: readonly string[],
    private readonly readiness: SavedReadiness,
  ) {}

  public describe(): string {
    return `save readiness of ${this.agentIds.length} Agents`;
  }

  public commit(transaction: StorageTransaction): void {
    if (this.agentIds.length === 0) return;
    transaction
      .update(agents)
      .set(this.readiness)
      .where(inArray(agents.id, [...this.agentIds]))
      .run();
  }
}

export type InstallationObservationRow = Pick<
  typeof agents.$inferInsert,
  | 'installationLaunch'
  | 'installationOwner'
  | 'installationVersion'
  | 'installationObservedAt'
> & { id: string };

const foundRegistryConfiguration = JSON.stringify({
  source: 'registry',
  release: null,
  overrides: { args: [], env: [] },
});

// A found Agent becomes a configured one; a removed one found again comes back. Enabled is never touched.
const configurationWhenFound = (current: string | null): string | null => {
  if (current === null) return foundRegistryConfiguration;
  const parsed = SavedConfiguration.safeParse(parseJson(current));
  if (!parsed.success || parsed.data.source !== 'registry') return current;
  if (!parsed.data.removed) return current;
  return JSON.stringify({ ...parsed.data, removed: undefined });
};
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

// Saves what the Resolver found; reads the row inside the commit so an install that committed first is kept.
export class InstallationObservationSaveJob implements WriterJob {
  public constructor(
    private readonly rows: readonly InstallationObservationRow[],
  ) {}

  public describe(): string {
    return `save installation observations of ${this.rows.length} Agents`;
  }

  public commit(transaction: StorageTransaction): void {
    for (const { id, ...observation } of this.rows) {
      const current = transaction
        .select({ configuration: agents.configuration })
        .from(agents)
        .where(eq(agents.id, id))
        .get();
      if (!current) continue;
      const configuration = observation.installationLaunch
        ? configurationWhenFound(current.configuration)
        : current.configuration;
      transaction
        .update(agents)
        .set({ ...observation, configuration })
        .where(eq(agents.id, id))
        .run();
    }
  }
}

// The jobs whose commit can change what the Agent catalog shows.
export const changesAgentCatalog = (job: WriterJob): boolean =>
  job instanceof AgentCatalogReplaceJob ||
  job instanceof InstallationObservationSaveJob ||
  job instanceof SyncJobUpdateJob ||
  job instanceof AgentConfigurationSaveJob ||
  job instanceof AgentReadinessSaveJob;
