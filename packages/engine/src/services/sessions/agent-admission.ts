import type { AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import { isAgentDisabled, readCustomDefinition } from '../agents';

type AdmissionContext = {
  adapters: readonly AgentAdapter[];
  database: Database;
};

const isKnownAgent = (context: AdmissionContext, agent: string): boolean =>
  context.adapters.some((adapter): boolean => adapter.agent === agent) ||
  readCustomDefinition(context.database, agent) !== undefined;

// A disabled Agent takes no new Sessions; Sessions it already has stay openable.
export const admitsNewSession = (
  context: AdmissionContext,
  agent: string,
): boolean =>
  isKnownAgent(context, agent) && !isAgentDisabled(context.database, agent);

export const admitsExistingSession = isKnownAgent;
