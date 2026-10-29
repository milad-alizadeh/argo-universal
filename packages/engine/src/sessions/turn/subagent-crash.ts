import type { FeedActorRef } from '../../feed';
import { TurnUpdateJob } from '../session-storage/session-storage';
import type { Subagents } from '../subagents';
import type { CrashEnding, SubagentTurnEnd } from './step';

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
): SubagentTurnEnd[] =>
  runningTurns(subagents).map(({ feed, turnId }) => ({
    feed,
    event: { type: 'feed.completeTurn', turnId, ending },
    write: { job: crashJob(turnId, ending) },
  }));
