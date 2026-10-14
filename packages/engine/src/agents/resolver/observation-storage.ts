import { AgentConfiguration as SavedConfiguration } from '@repo/contracts';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';

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
const configurationWhenFound = (current: string | null): string | null =>
  current === null ? foundRegistryConfiguration : revived(current);

// Only a removed Registry Agent comes back; a removed custom Agent stays removed.
const revived = (current: string): string => {
  const configuration = parseConfiguration(current);

  return configuration && isRemovedRegistry(configuration)
    ? JSON.stringify({ ...configuration, removed: undefined })
    : current;
};

const isRemovedRegistry = (configuration: SavedConfiguration): boolean =>
  configuration.source === 'registry' && configuration.removed === true;

const parseConfiguration = (text: string): SavedConfiguration | undefined => {
  try {
    const parsed = SavedConfiguration.safeParse(JSON.parse(text));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

const readConfiguration = (
  transaction: StorageTransaction,
  id: string,
): string | null | undefined =>
  transaction
    .select({ configuration: agents.configuration })
    .from(agents)
    .where(eq(agents.id, id))
    .get()?.configuration;

// Saves one observation; a row removed meanwhile is never recreated.
const saveObservation = (
  transaction: StorageTransaction,
  { id, ...observation }: InstallationObservationRow,
): void => {
  const current = readConfiguration(transaction, id);

  if (current === undefined) return;

  const configuration = observation.installationLaunch
    ? configurationWhenFound(current)
    : current;

  transaction
    .update(agents)
    .set({ ...observation, configuration })
    .where(eq(agents.id, id))
    .run();
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
    for (const row of this.rows) saveObservation(transaction, row);
  }
}
