import { agentAdapters, type AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import type { ResolveAgentLaunch } from './agent-launch';
import { resolveCustomAgentLaunch } from './configuration/custom-launch';

export type AgentLaunchSources = {
  database: Database;
  adapters?: readonly AgentAdapter[];
  resolveAgentLaunch?: ResolveAgentLaunch;
};

export const selectAgentLaunchResolver = (
  sources: AgentLaunchSources,
  agent: string,
): ResolveAgentLaunch | undefined =>
  (sources.adapters ?? agentAdapters).some((adapter) => adapter.agent === agent)
    ? sources.resolveAgentLaunch
    : resolveCustomAgentLaunch(sources.database);
