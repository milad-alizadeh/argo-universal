import type { StopReason, TurnUsage } from '@repo/contracts';
import {
  TurnInsertJob,
  TurnUpdateJob,
} from '../session-storage/session-storage';
import type { ChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';

export type SubagentWorkState = {
  state?: string;
  stopReason?: StopReason;
  usage?: TurnUsage;
};

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

function endSubagentWork(
  input: SubagentRouting,
  child: ChildFeed,
  outcome: SubagentWorkState,
): ChildFeed {
  if (!child.turnId) return child;

  child.feed.send({ type: 'feed.completeTurn', turnId: child.turnId });
  input.write(finishWorkJob(child.turnId, input.now(), outcome));

  return { ...child, turnId: null };
}

export function updateSubagentWork(
  input: SubagentRouting,
  child: ChildFeed,
  state: SubagentWorkState,
): ChildFeed {
  if (state.state === 'idle') return endSubagentWork(input, child, state);

  if (activeStates.has(state.state)) return startWork(input, child);

  return child;
}

const activeStates = new Set<string | undefined>([
  'running',
  'requires_action',
]);

const finishWorkJob = (
  id: string,
  endedAt: number,
  outcome: SubagentWorkState,
): TurnUpdateJob =>
  new TurnUpdateJob({
    id,
    set: {
      status: 'ended',
      endedAt,
      stopReason: outcome.stopReason,
      usage: outcome.usage,
    },
  });
