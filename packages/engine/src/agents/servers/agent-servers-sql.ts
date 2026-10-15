import {
  AgentServerEnvironment,
  type AgentServer,
  type ACPAgent,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentServers } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import { readRegistryCache, registrySupport } from '../registry/registry-cache';

export const readAgentServers = (database: Database): AgentServer[] => {
  const entries = readRegistryCache(database)?.agents ?? [];

  return database
    .select()
    .from(agentServers)
    .all()
    .flatMap((row) => hydrateServer(row, entries));
};

export const readAgentServerEnv = (
  database: Database,
  id: string,
): AgentServerEnvironment => {
  const row = database
    .select()
    .from(agentServers)
    .where(eq(agentServers.id, id))
    .get();

  return row ? AgentServerEnvironment.parse(JSON.parse(row.env)) : {};
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
