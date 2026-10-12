import type { AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import {
  isAgentDisabled,
  readCustomDefinition,
  readInstallSelection,
} from '../agents';

type AdmissionContext = {
  adapters: readonly AgentAdapter[];
  database: Database;
  isAgentSetupBusy?: (agentId: string) => boolean;
};

const isKnownAgent = (context: AdmissionContext, agent: string): boolean =>
  !context.isAgentSetupBusy?.(agent) &&
  (context.adapters.some((adapter): boolean => adapter.agent === agent) ||
    readCustomDefinition(context.database, agent) !== undefined ||
    readInstallSelection(context.database, agent) !== undefined);

// A disabled Agent takes no new Sessions; Sessions it already has stay openable.
export const admitsNewSession = (
  context: AdmissionContext,
  agent: string,
): boolean =>
  isKnownAgent(context, agent) && !isAgentDisabled(context.database, agent);

export const admitsExistingSession = isKnownAgent;
