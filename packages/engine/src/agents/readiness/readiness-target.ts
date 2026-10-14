import type { AgentCheck, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  readConfiguredAgent,
  readConfiguredAgents,
} from '../configuration/configuration-sql';
import {
  checkSelectedFiles,
  readInstallSelection,
} from '../install/selection/selection';
import { ReadinessSkipped } from './readiness-skipped';

type Selection = NonNullable<ReturnType<typeof readInstallSelection>>;
export type ReadinessTarget = {
  agentId: string;
  name: string;
  selection?: Selection;
};

export const notFoundReason = (name: string): string =>
  `The installed files of ${name} are missing. Repair installs them again.`;

const configured = (agent: ConfiguredAgent | undefined): ConfiguredAgent => {
  if (!agent || agent.configuration.removed)
    throw new ReadinessSkipped('Agent was removed.');
  return agent;
};
const enabled = (agent: ConfiguredAgent): ConfiguredAgent => {
  if (!agent.enabled)
    throw new ReadinessSkipped('Agent is disabled. Enable it to check it.');
  return agent;
};
const registryTarget = (
  database: Database,
  agentId: string,
): ReadinessTarget => {
  const selection = readInstallSelection(database, agentId);
  if (!selection) throw new ReadinessSkipped('Agent is not installed.');
  return { agentId, name: selection.entry.name, selection };
};

// Only an installed, enabled Agent is ever checked; anything else is skipped, never launched.
export const readTarget = (
  database: Database,
  agentId: string,
): ReadinessTarget => {
  const agent = enabled(configured(readConfiguredAgent(database, agentId)));
  return agent.configuration.source === 'custom'
    ? { agentId, name: agent.configuration.definition.name }
    : registryTarget(database, agentId);
};

export const checkableAgents = (database: Database): string[] =>
  readConfiguredAgents(database).flatMap((agent) => {
    try {
      return [readTarget(database, agent.id).agentId];
    } catch {
      return [];
    }
  });

// Missing launch files are Not found without launching anything; identity and Sessions stay.
export const missingFiles = async (
  home: string,
  target: ReadinessTarget,
): Promise<AgentCheck | null> => {
  const { agentId, name, selection } = target;
  if (!selection) return null;
  const notFound: AgentCheck = {
    status: 'not-found',
    reason: notFoundReason(name),
  };
  return checkSelectedFiles(home, agentId, selection).then(
    () => null,
    () => notFound,
  );
};
