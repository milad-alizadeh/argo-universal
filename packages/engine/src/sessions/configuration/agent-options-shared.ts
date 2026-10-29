import {
  AgentConfiguration,
  type SessionAgentOptionsInput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentOptions } from '@repo/db/schema';
import { and, eq, type SQL } from 'drizzle-orm';
import type { WriterActorRef } from '../../storage';

export type Stored = AgentConfiguration & { revision: number };

export type Sources = { database: Database; writer?: WriterActorRef };

export const ownerWhere = (owner: SessionAgentOptionsInput): SQL | undefined =>
  and(
    eq(agentOptions.agent, owner.agent),
    eq(agentOptions.projectId, owner.projectId),
  );

export const decode = (row: typeof agentOptions.$inferSelect): Stored => ({
  ...AgentConfiguration.parse({
    agent: row.agent,
    projectId: row.projectId,
    configOptions: row.configOptions,
    commands: row.commands,
  }),
  revision: row.revision,
});
