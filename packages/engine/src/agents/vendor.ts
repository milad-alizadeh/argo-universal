import type { AgentLaunch } from './agent-launch';

const environment = new Map<string, Readonly<Record<string, string>>>([
  ['claude-acp', { ANTHROPIC_API_KEY: '' }],
]);

export const vendorEnvironment = (
  launch: Pick<AgentLaunch, 'registryId'>,
): Readonly<Record<string, string>> =>
  launch.registryId ? (environment.get(launch.registryId) ?? {}) : {};

export const terminalAuthSuccessPatterns = (
  methodId: string,
): readonly string[] =>
  methodId === 'claude-login' ? ['Login successful', 'Type your message'] : [];
