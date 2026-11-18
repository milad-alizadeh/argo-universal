import { readLatestTurn } from '../session-storage';
import type { ChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';

export function childTurnState(
  input: SubagentRouting,
  sessionId: string,
): Pick<ChildFeed, 'turnId' | 'model'> {
  const latest = readLatestTurn(input, sessionId);

  if (!latest) return { turnId: null, model: null };

  return {
    turnId: latest.status === 'running' ? latest.id : null,
    model: latest.model,
  };
}
