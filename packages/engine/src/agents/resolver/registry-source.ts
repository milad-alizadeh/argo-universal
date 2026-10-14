import type { ACPAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import {
  readInstallSelection,
  type InstallSelection,
} from '../install/selection/selection';
import { createRegistryReader } from '../registry/registry-reader';

// `commandName` is what an npm install of the entry's npx package puts on PATH, as catalog sync read it.
export type RegistrySource = {
  entry: ACPAgent;
  selection?: InstallSelection;
  commandName?: string;
};

const reader = createRegistryReader();

const parseEntry = (metadata: string): ACPAgent | undefined => {
  try {
    return reader.parseAgent(metadata);
  } catch {
    return undefined;
  }
};
type CatalogRow = { entry?: ACPAgent; commandName?: string };
const catalogRow = (database: Database, agentId: string): CatalogRow => {
  const row = database
    .select({ metadata: agents.registryMetadata, command: agents.commandName })
    .from(agents)
    .where(eq(agents.id, agentId))
    .get();
  return row ? savedCatalogRow(row) : {};
};
const savedCatalogRow = (row: {
  metadata: string | null;
  command: string | null;
}): CatalogRow => ({
  entry: row.metadata === null ? undefined : parseEntry(row.metadata),
  commandName: row.command ?? undefined,
});

// The Registry entry behind an Agent: its Argo installation's saved entry first, else its catalog row.
export const readRegistrySource = (
  database: Database,
  agentId: string,
): RegistrySource | undefined => {
  const selection = readInstallSelection(database, agentId);
  const { entry, commandName } = catalogRow(database, agentId);
  if (selection) return { entry: selection.entry, selection, commandName };
  return entry && { entry, commandName };
};
