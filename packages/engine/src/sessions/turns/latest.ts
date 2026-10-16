import type { Turn } from '@repo/contracts';

export function latestTurnOf(
  turns: readonly Turn[],
  sessionId: string,
): Turn | undefined {
  return turns
    .filter((turn): boolean => turn.sessionId === sessionId)
    .toSorted(
      (first, second): number =>
        second.startedAt - first.startedAt || second.id.localeCompare(first.id),
    )[0];
}
