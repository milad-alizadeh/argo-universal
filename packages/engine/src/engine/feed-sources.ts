import type { Database } from '@repo/db';
import type { FeedDeps } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import {
  findSessionFeed,
  type OpenSessionsActorRef,
  type SessionActorRef,
  sessionActorId,
  sessionMachine,
} from '../sessions';

export type FeedSourcesInput = {
  database: Database;
  sessions: OpenSessionsActorRef;
};

export type FeedSources = FeedSourcesInput &
  Pick<FeedDeps, 'findFeed' | 'findWriter'> & {
    findSession: (sessionId: string) => SessionActorRef | undefined;
  };

const findLiveSession =
  (sessions: OpenSessionsActorRef) =>
  (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );

// Where the Feed finds the live Session, its feed actor and the Writer.
export function createFeedSources(input: FeedSourcesInput): FeedSources {
  return {
    ...input,
    findSession: findLiveSession(input.sessions),
    findFeed: (sessionId) => findSessionFeed(input.sessions.system, sessionId),
    findWriter: () => input.sessions.getSnapshot().context.writer,
  };
}
