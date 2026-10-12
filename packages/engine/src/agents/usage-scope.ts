import type { TurnUsage } from '@repo/contracts';

export const reportsModelCallContext = (name: string | undefined): boolean =>
  name === '@agentclientprotocol/codex-acp';

export const promptUsageScope = (
  name: string | undefined,
  version: string | undefined,
): NonNullable<TurnUsage['scope']> => {
  if (reportsModelCallContext(name)) return 'model-call';
  return name === '@agentclientprotocol/claude-agent-acp' &&
    version === '0.88.0'
    ? 'turn'
    : 'agent-reported';
};
