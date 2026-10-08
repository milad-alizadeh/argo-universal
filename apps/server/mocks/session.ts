import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import { onTestFinished } from 'vitest';
import { createActor, setup } from 'xstate';
import type { FeedActorRef } from '../src/services/feed';
import { createFeedService } from '../src/services/feed';
import { writerMachine } from '../src/services/feed';
import {
  createSessionReader,
  createSessionSnapshotWatcher,
} from '../src/services/sessions';
import { type SessionCommand, sessionMachine } from '../src/services/sessions';

export const firstPrompt: Extract<SessionCommand, { type: 'session.prompt' }> =
  { type: 'session.prompt', turnId: 'turn-1', content: [] };

export function createSessionHost(
  database: Database,
  adapter: AgentAdapter,
): {
  root: import('xstate').Actor<
    import('xstate').StateMachine<
      import('xstate').MachineContext,
      import('xstate').AnyEventObject,
      {
        databaseWriter?: import('xstate').ActorRefFromLogic<
          typeof writerMachine
        >;
        session?: import('xstate').ActorRefFromLogic<typeof sessionMachine>;
      },
      | { src: 'session'; logic: typeof sessionMachine; id: 'session' }
      | { src: 'writer'; logic: typeof writerMachine; id: 'databaseWriter' },
      never,
      never,
      never,
      Record<never, never>,
      string,
      import('xstate').NonReducibleUnknown,
      import('xstate').NonReducibleUnknown,
      import('xstate').EventObject,
      import('xstate').MetaObject,
      Record<never, never>,
      import('xstate').MetaObject
    >
  >;
  session: import('xstate').ActorRefFromLogic<typeof sessionMachine>;
  service: import('@repo/api').FeedService;
  findFeed: () => FeedActorRef | undefined;
} {
  const runtimeDirectory = mkdtempSync(join(tmpdir(), 'session-runtime-'));
  onTestFinished((): void =>
    rmSync(runtimeDirectory, { recursive: true, force: true }),
  );
  const root = createActor(
    setup({
      actors: {
        session: sessionMachine,
        writer: writerMachine,
      },
    }).createMachine({
      invoke: [
        {
          id: 'databaseWriter',
          systemId: 'databaseWriter',
          src: 'writer',
          input: {
            now: (): number => Date.now(),
            database,
          },
        },
        {
          id: 'session',
          systemId: 'session:session-1',
          src: 'session',
          input: {
            now: (): number => Date.now(),
            createId: randomUUID,
            database,
            runtimeDirectory,
            adapter,
            kind: 'existing',
            sessionId: 'session-1',
          },
        },
      ],
    }),
  ).start();
  const session = root.getSnapshot().children.session;
  if (!session) throw new Error('Session not started');
  const findFeed = (): FeedActorRef | undefined =>
    session.getSnapshot().children.feed;
  const service = createFeedService({
    database,
    findFeed,
    findWriter: ():
      | import('xstate').ActorRefFromLogic<typeof writerMachine>
      | undefined => root.getSnapshot().children.databaseWriter,
    readSession: createSessionReader(database),
    watchSessionSnapshot: createSessionSnapshotWatcher({
      database,
      findFeed,
      findWriter: ():
        | import('xstate').ActorRefFromLogic<typeof writerMachine>
        | undefined => root.getSnapshot().children.databaseWriter,
      findSession: (): import('xstate').ActorRefFromLogic<
        typeof sessionMachine
      > => session,
    }),
  });
  return { root, session, service, findFeed };
}
