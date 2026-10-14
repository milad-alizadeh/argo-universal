import type { Database } from '@repo/db';
import {
  isAgentDisabled,
  readConfiguredAgent,
  readCustomDefinition,
  readInstallationObservation,
  readInstallSelection,
} from '../agents';

type AdmissionContext = {
  database: Database;
  isAgentSetupBusy?: (agentId: string) => boolean;
};

// A removed Agent takes no new Sessions even while its files are still found.
const isFoundAgent = (database: Database, agent: string): boolean => {
  const configured = readConfiguredAgent(database, agent);
  return (
    configured !== undefined &&
    !configured.configuration.removed &&
    readInstallationObservation(database, agent).found
  );
};

// Custom, installed by Argo or last found by the Resolver; the launch resolves again when the Session opens.
const isKnownAgent = (context: AdmissionContext, agent: string): boolean =>
  !context.isAgentSetupBusy?.(agent) &&
  (readCustomDefinition(context.database, agent) !== undefined ||
    readInstallSelection(context.database, agent) !== undefined ||
    isFoundAgent(context.database, agent));

// A disabled Agent takes no new Sessions; Sessions it already has stay openable.
export const admitsNewSession = (
  context: AdmissionContext,
  agent: string,
): boolean =>
  isKnownAgent(context, agent) && !isAgentDisabled(context.database, agent);

export const admitsExistingSession = isKnownAgent;
