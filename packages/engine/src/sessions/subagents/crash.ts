import type { FeedActorRef, FeedEvent, FeedTurnEnding } from '../../feed';
import { TurnUpdateJob } from '../session-storage/session-storage';
import type { ChildFeed } from './child-feed';
import type { Subagents } from './routing';

type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

type ChildCrash = { feed: FeedActorRef; event: FeedEvent; job: TurnUpdateJob };

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

const crash = (
  feed: FeedActorRef,
  turnId: string,
  ending: CrashEnding,
): ChildCrash => ({
  feed,
  job: crashJob(turnId, ending),
  event: { type: 'feed.completeTurn', turnId, ending },
});

const childCrash = (child: ChildFeed, ending: CrashEnding): ChildCrash[] =>
  child.turnId ? [crash(child.feed, child.turnId, ending)] : [];

export const crashedSubagentTurns = (
  subagents: Subagents,
  ending: CrashEnding,
): ChildCrash[] =>
  [...subagents.children.values()].flatMap((child) =>
    childCrash(child, ending),
  );
