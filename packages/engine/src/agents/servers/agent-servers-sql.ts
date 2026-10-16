import {
  AgentServerEnvironment,
  AgentServerRecord,
  type AgentServer,
  type ACPAgent,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentServers } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import { readRegistryCache, registrySupport } from '../registry/registry-cache';
import { createRegistryReader } from '../registry/registry-reader';
import type { InstalledAgent } from './installed-agents';

export const readAgentServers = (database: Database): AgentServer[] => {
  const entries = readRegistryCache(database)?.agents ?? [];

  return database
    .select()
    .from(agentServers)
    .all()
    .flatMap((row) => hydrateServer(parseServerRow(row), entries));
};

export class AgentServerChangeJob implements WriterJob {
  public constructor(
    private readonly id: string,
    private readonly operation: 'add' | 'remove',
  ) {}
  public describe(): string {
    return `${this.operation} Registry Agent ${this.id}`;
  }
  public commit(transaction: StorageTransaction): void {
    if (this.operation === 'remove') {
      transaction
        .delete(agentServers)
        .where(eq(agentServers.id, this.id))
        .run();

      return;
    }

    transaction
      .insert(agentServers)
      .values({ id: this.id })
      .onConflictDoNothing()
      .run();
  }
}

const hydrateServer = (
  row: typeof agentServers.$inferSelect,
  entries: ACPAgent[],
): AgentServer[] => {
  const entry = entries.find(({ id }) => id === row.id);

  if (!entry || registrySupport(entry) === 'unavailable') return [];

  return [serverView(row, entry)];
};

const serverView = (
  row: typeof agentServers.$inferSelect,
  entry: ACPAgent,
): AgentServer => ({
  id: row.id,
  name: entry.name,
  icon: entry.icon,
  version: entry.version,
  env: AgentServerEnvironment.parse(JSON.parse(row.env)),
});

const parseServerRow = (
  row: typeof agentServers.$inferSelect,
): typeof agentServers.$inferSelect => {
  const parsed = AgentServerRecord.safeParse(row);

  if (!parsed.success)
    return createRegistryReader().reject(
      'Stored saved Agent row is malformed',
      parsed.error,
    );

  return parsed.data;
};

// The agent_servers row of an Installed Agent, or undefined when the user has not installed it.
export const readAgentServer = (
  database: Database,
  id: string,
): InstalledAgent | undefined => {
  const row = database
    .select()
    .from(agentServers)
    .where(eq(agentServers.id, id))
    .get();

  return row && serverRow(parseServerRow(row));
};

const serverRow = (row: typeof agentServers.$inferSelect): InstalledAgent => ({
  id: row.id,
  env: AgentServerEnvironment.parse(JSON.parse(row.env)),
});
