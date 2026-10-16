import { TurnInsertJob, TurnUpdateJob } from '../session-storage';
import type { ChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';

function startWork(input: SubagentRouting, child: ChildFeed): ChildFeed {
  if (child.turnId) return child;
  const turnId = input.createId();

  input.write(
    new TurnInsertJob({
      turn: {
        id: turnId,
        sessionId: child.sessionId,
        status: 'running',
        startedAt: input.now(),
      },
    }),
  );

  return { ...child, turnId };
}

export function endSubagentWork(
  input: SubagentRouting,
  child: ChildFeed,
): ChildFeed {
  if (!child.turnId) return child;

  child.feed.send({ type: 'feed.completeTurn', turnId: child.turnId });
  input.write(
    new TurnUpdateJob({
      id: child.turnId,
      set: { status: 'ended', endedAt: input.now() },
    }),
  );

  return { ...child, turnId: null };
}

export function updateSubagentWork(
  input: SubagentRouting,
  child: ChildFeed,
  state: string | undefined,
): ChildFeed {
  if (state === 'idle') return endSubagentWork(input, child);

  if (activeStates.has(state)) return startWork(input, child);

  return child;
}

const activeStates = new Set<string | undefined>([
  'running',
  'requires_action',
]);
