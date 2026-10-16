import { readLatestTurn } from '../session-storage';
import type { SubagentRouting } from './routing-types';

export function activeChildTurn(
  input: SubagentRouting,
  sessionId: string,
): string | null {
  const latest = readLatestTurn(input, sessionId);

  return latest?.status === 'running' ? latest.id : null;
}
