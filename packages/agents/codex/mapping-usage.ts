import type { TurnUsage } from '@repo/contracts';
import type { TokenUsageBreakdown } from './protocol.gen';
const zeroUsage: TokenUsageBreakdown = {
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  cachedInputTokens: 0,
  cacheWriteInputTokens: 0,
};
export const subtractUsage = (
  total: TokenUsageBreakdown,
  start: TokenUsageBreakdown | null,
): TokenUsageBreakdown => {
  const baseline = start ?? zeroUsage;
  return {
    totalTokens: total.totalTokens - baseline.totalTokens,
    inputTokens: total.inputTokens - baseline.inputTokens,
    outputTokens: total.outputTokens - baseline.outputTokens,
    reasoningOutputTokens:
      total.reasoningOutputTokens - baseline.reasoningOutputTokens,
    cachedInputTokens: total.cachedInputTokens - baseline.cachedInputTokens,
    cacheWriteInputTokens: writeTokens(total, baseline),
  };
};
export const usageOf = (
  total: TokenUsageBreakdown,
  start: TokenUsageBreakdown | null,
): TurnUsage => {
  const usage = subtractUsage(total, start);
  return {
    totalTokens: usage.totalTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    thoughtTokens: usage.reasoningOutputTokens,
    cachedReadTokens: usage.cachedInputTokens,
    cachedWriteTokens: usage.cacheWriteInputTokens,
  };
};

const writeTokens = (
  total: TokenUsageBreakdown,
  start: TokenUsageBreakdown,
): number => total.cacheWriteInputTokens - start.cacheWriteInputTokens;
