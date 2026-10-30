import {
  AgentConfiguration,
  type SessionAgentOptionsInput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentOptions } from '@repo/db/schema';
import { and, eq, type SQL } from 'drizzle-orm';
import type { WriterActorRef } from '../../storage';
import type { OpenSessions } from '../open-sessions';
import type { HandlerSources, SessionSources } from '../session-sources';
import type { RowSources } from '../session-storage';

export type Stored = AgentConfiguration & { revision: number };

export type Sources = { database: Database; writer?: WriterActorRef };

// Saved rows, with the writes still queued over them.
export const storageSources = (
  sources: Pick<SessionSources, 'database' | 'findWriter'>,
): RowSources => ({
  database: sources.database,
  writer: sources.findWriter(),
});

// What discovering an Agent's options reads: its saved rows, the installed Agent and an ACP Session of its own.
export type DiscoverySources = HandlerSources<
  'database' | 'findWriter' | 'installedAgents' | 'slashCommandsWaitMs',
  'admit' | 'acpResources'
>;

// A Session's options reader also follows its live Session.
export type AgentOptionsSources = DiscoverySources & {
  open: Pick<OpenSessions, 'session' | 'subscribe'>;
};

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
