import type { Database } from '@repo/db';
import { feedMachine, type FeedActorRef, type FeedDeps } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import {
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

const findOpenSession =
  (sessions: OpenSessionsActorRef) =>
  (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );

// An open Session's Feed, or a Subagent's, which its parent Session runs.
const findSessionFeed =
  (sessions: OpenSessionsActorRef) =>
  (sessionId: string): FeedActorRef | undefined =>
    findOpenSession(sessions)(sessionId)?.getSnapshot().children.feed ??
    findMachineActor(
      sessions.system,
      `subagent-feed:${sessionId}`,
      feedMachine,
    );

// Where the Feed finds the live Session, its feed actor and the Writer.
export function createFeedSources(input: FeedSourcesInput): FeedSources {
  return {
    ...input,
    findSession: findOpenSession(input.sessions),
    findFeed: findSessionFeed(input.sessions),
    findWriter: () => input.sessions.getSnapshot().context.writer,
  };
}
