import type { TurnUsage } from '@repo/contracts';

export const reportsModelCallContext = (name: string | undefined): boolean =>
  name === '@agentclientprotocol/codex-acp';

export const promptUsageScope = (
  name: string | undefined,
  version: string | undefined,
): NonNullable<TurnUsage['scope']> => {
  if (reportsModelCallContext(name)) return 'model-call';

  return claudeUsageScope(name, version);
};

const claudeUsageScope = (
  name: string | undefined,
  version: string | undefined,
): NonNullable<TurnUsage['scope']> => {
  if (name !== '@agentclientprotocol/claude-agent-acp') return 'agent-reported';

  return version === '0.88.0' ? 'turn' : 'agent-reported';
};
