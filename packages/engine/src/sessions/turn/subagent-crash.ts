import type { FeedActorRef, FeedTurnEnding } from '../../feed';
import { TurnUpdateJob } from '../session-storage/session-storage';
import type { Subagents } from '../subagents';
import type { TurnStep } from './values';

type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

type RunningTurn = { feed: FeedActorRef; turnId: string };

const crashJob = (turnId: string, ending: CrashEnding): TurnUpdateJob =>
  new TurnUpdateJob({
    id: turnId,
    set: {
      status: 'ended',
      stopReason: 'error',
      endedAt: ending.occurredAt,
      error: { code: 'interrupted', message: ending.title },
    },
  });

const runningTurns = (subagents: Subagents): RunningTurn[] =>
  [...subagents.children.values()].flatMap((child) =>
    child.turnId ? [{ feed: child.feed, turnId: child.turnId }] : [],
  );

// Each Subagent Turn an Agent crash cut short ends with the crash.
export const crashedSubagentTurns = (
  subagents: Subagents,
  ending: CrashEnding,
): Pick<TurnStep, 'writes' | 'subagentFeeds'> => {
  const turns = runningTurns(subagents);

  return {
    writes: turns.map(({ turnId }) => ({ job: crashJob(turnId, ending) })),
    subagentFeeds: turns.map(({ feed, turnId }) => ({
      feed,
      event: { type: 'feed.completeTurn', turnId, ending },
    })),
  };
};
