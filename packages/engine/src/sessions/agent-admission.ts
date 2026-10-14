import type { Database } from '@repo/db';
import {
  isAgentDisabled,
  readCustomDefinition,
  readInstallationObservation,
  readInstallSelection,
} from '../agents';

type AdmissionContext = {
  database: Database;
  isAgentSetupBusy?: (agentId: string) => boolean;
};

// Custom, installed by Argo or last found by the Resolver; the launch resolves again when the Session opens.
const isKnownAgent = (context: AdmissionContext, agent: string): boolean =>
  !context.isAgentSetupBusy?.(agent) &&
  (readCustomDefinition(context.database, agent) !== undefined ||
    readInstallSelection(context.database, agent) !== undefined ||
    readInstallationObservation(context.database, agent).found);

// A disabled Agent takes no new Sessions; Sessions it already has stay openable.
export const admitsNewSession = (
  context: AdmissionContext,
  agent: string,
): boolean =>
  isKnownAgent(context, agent) && !isAgentDisabled(context.database, agent);

export const admitsExistingSession = isKnownAgent;
