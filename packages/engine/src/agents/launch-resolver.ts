import { agentAdapters, type AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import type { ResolveAgentLaunch } from './agent-launch';
import { resolveInstalledAgentLaunch } from './install/selection/launch';
import { readInstallSelection } from './install/selection/selection';

export type AgentLaunchSources = {
  database: Database;
  runtimeDirectory: string;
  adapters?: readonly AgentAdapter[];
  resolveAgentLaunch?: ResolveAgentLaunch;
};

export const selectAgentLaunchResolver = (
  sources: AgentLaunchSources,
  agent: string,
): ResolveAgentLaunch | undefined =>
  (sources.adapters ?? agentAdapters).some(
    (adapter) => adapter.agent === agent,
  ) && !readInstallSelection(sources.database, agent)
    ? sources.resolveAgentLaunch
    : resolveInstalledAgentLaunch(sources.database, sources.runtimeDirectory);
