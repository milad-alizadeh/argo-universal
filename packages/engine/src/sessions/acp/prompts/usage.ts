import type {
  InitializeResponse,
  PromptResponse,
  UsageUpdate,
} from '@agentclientprotocol/sdk';
import type { ContextUsage, TurnUsage } from '@repo/contracts';
import { reportsModelCallContext, promptUsageScope } from '../../../agents';

const contextScope = (
  initialization: InitializeResponse | undefined,
): ContextUsage['scope'] => {
  if (!initialization) return 'unverified';

  return agentContextScope(initialization.agentInfo);
};

const agentContextScope = (
  agent: InitializeResponse['agentInfo'],
): ContextUsage['scope'] =>
  reportsModelCallContext(agent?.name) ? 'model-call' : undefined;

export const acpContextUsage = (
  update: UsageUpdate,
  initialization: InitializeResponse | undefined,
): ContextUsage => ({
  used: update.used,
  size: update.size,
  cost: update.cost ?? undefined,
  scope: contextScope(initialization),
});

const availableCount = (count: number | null | undefined): number | undefined =>
  count ?? undefined;

const tokenCounts = (
  usage: NonNullable<PromptResponse['usage']>,
): Omit<TurnUsage, 'scope'> => ({
  totalTokens: usage.totalTokens,
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  thoughtTokens: availableCount(usage.thoughtTokens),
  cachedReadTokens: availableCount(usage.cachedReadTokens),
  cachedWriteTokens: availableCount(usage.cachedWriteTokens),
});

const reportedScope = (
  agent: InitializeResponse['agentInfo'],
): TurnUsage['scope'] => promptUsageScope(agent?.name, agent?.version);

export const acpTurnUsage = (
  usage: PromptResponse['usage'],
  agent?: InitializeResponse['agentInfo'],
): TurnUsage | undefined => {
  if (usage == null) return undefined;

  return {
    scope: reportedScope(agent),
    ...tokenCounts(usage),
  };
};
