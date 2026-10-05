import { agentMachine } from '@repo/agents';
import type { Database } from '@repo/db';
import { createActor, setup } from 'xstate';
import type { FeedActorRef } from '../src/services/feed/feed-machine';
import { createFeedService } from '../src/services/feed/feed-service';
import { writerMachine } from '../src/services/feed/writer-machine';
import {
  type SessionCommand,
  sessionMachine,
} from '../src/services/sessions/session-machine';

export const firstPrompt: Extract<SessionCommand, { type: 'session.prompt' }> =
  { type: 'session.prompt', turnId: 'turn-1', content: [] };

export function createSessionHost(database: Database, agent = agentMachine) {
  const root = createActor(
    setup({
      actors: {
        session: sessionMachine.provide({ actors: { agent } }),
        writer: writerMachine,
      },
    }).createMachine({
      invoke: [
        {
          id: 'databaseWriter',
          systemId: 'databaseWriter',
          src: 'writer',
          input: { database },
        },
        {
          id: 'session',
          systemId: 'session:session-1',
          src: 'session',
          input: { database, kind: 'existing', sessionId: 'session-1' },
        },
      ],
    }),
  ).start();
  const session = root.getSnapshot().children.session;
  if (!session) throw new Error('Session not started');
  const findFeed = () =>
    session.getSnapshot().children.feed as FeedActorRef | undefined;
  const service = createFeedService({
    database,
    findFeed,
    findWriter: () => root.getSnapshot().children.databaseWriter,
    findSession: () => session,
  });
  return { root, session, service, findFeed };
}
