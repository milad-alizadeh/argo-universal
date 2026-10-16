import type { AgentLaunch } from './agent-launch';

const environment = new Map<string, Readonly<Record<string, string>>>([
  ['claude-acp', { ANTHROPIC_API_KEY: '' }],
]);

export const vendorEnvironment = (
  launch: AgentLaunch,
): Readonly<Record<string, string>> =>
  launch.registryId ? (environment.get(launch.registryId) ?? {}) : {};
