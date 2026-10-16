import type { Database } from '@repo/db';
import {
  isAgentDisabled,
  readCustomDefinition,
  readInstallSelection,
} from '../agents';

type AdmissionContext = {
  database: Database;
  isAgentSetupBusy?: (agentId: string) => boolean;
};

const isKnownAgent = (context: AdmissionContext, agent: string): boolean =>
  !context.isAgentSetupBusy?.(agent) &&
  (readCustomDefinition(context.database, agent) !== undefined ||
    readInstallSelection(context.database, agent) !== undefined);

// A disabled Agent takes no new Sessions; Sessions it already has stay openable.
export const admitsNewSession = (
  context: AdmissionContext,
  agent: string,
): boolean =>
  isKnownAgent(context, agent) && !isAgentDisabled(context.database, agent);

export const admitsExistingSession = isKnownAgent;

// Spec 0014's wording for a past Session whose Agent is gone; an Agent mid-setup keeps the generic refusal.
export const existingSessionRefusal = (
  context: AdmissionContext,
  agent: string,
): string | undefined =>
  isKnownAgent(context, agent) || context.isAgentSetupBusy?.(agent)
    ? undefined
    : `Agent "${agent}" is not installed.`;
