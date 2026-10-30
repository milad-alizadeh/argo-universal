import { startingRank, type SessionConfigOption } from '@repo/contracts';
import { findOption } from './offered';
import type { AgentConfigValue } from './values';

const rankOf = (
  options: readonly SessionConfigOption[],
  choice: AgentConfigValue,
): number => startingRank(findOption(options, choice.configId) ?? choice);

// The next choice in Starting choices order, read against the options the Agent offers now, and the rest.
export function nextChoice(
  pending: readonly AgentConfigValue[],
  options: readonly SessionConfigOption[],
): [AgentConfigValue | undefined, AgentConfigValue[]] {
  const [next, ...rest] = pending.toSorted(
    (left, right) => rankOf(options, left) - rankOf(options, right),
  );

  return [next, rest];
}
