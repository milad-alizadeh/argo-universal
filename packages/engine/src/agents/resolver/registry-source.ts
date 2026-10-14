import type { ACPAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  readInstallSelection,
  type InstallSelection,
} from '../install/selection/selection';
import { createRegistryReader } from '../registry/registry-reader';

// `commandNames` are what an npm install of the entry's npx package puts on PATH for its command, as catalog sync read them.
export type RegistrySource = {
  entry: ACPAgent;
  selection?: InstallSelection;
  commandNames?: string[];
};

const reader = createRegistryReader();

const parseEntry = (metadata: string): ACPAgent | undefined => {
  try {
    return reader.parseAgent(metadata);
  } catch {
    return undefined;
  }
};

const CommandNames = z.array(z.string()).min(1);

const parseCommandNames = (saved: string): string[] | undefined => {
  try {
    return CommandNames.parse(JSON.parse(saved));
  } catch {
    return undefined;
  }
};

type CatalogRow = { entry?: ACPAgent; commandNames?: string[] };

const catalogRow = (database: Database, agentId: string): CatalogRow => {
  const row = database
    .select({ metadata: agents.registryMetadata, command: agents.commandNames })
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
  commandNames:
    row.command === null ? undefined : parseCommandNames(row.command),
});

// The Registry entry behind an Agent: its Argo installation's saved entry first, else its catalog row.
export const readRegistrySource = (
  database: Database,
  agentId: string,
): RegistrySource | undefined => {
  const selection = readInstallSelection(database, agentId);
  const { entry, commandNames } = catalogRow(database, agentId);

  if (selection) return { entry: selection.entry, selection, commandNames };

  return entry && { entry, commandNames };
};
