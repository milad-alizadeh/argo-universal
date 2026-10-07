import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentAdapter } from '@repo/agents';
import type { Database } from '@repo/db';
import { onTestFinished } from 'vitest';
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

export function createSessionHost(database: Database, adapter: AgentAdapter) {
  const runtimeDirectory = mkdtempSync(join(tmpdir(), 'session-runtime-'));
  onTestFinished(() =>
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
            now: () => Date.now(),
            database,
          },
        },
        {
          id: 'session',
          systemId: 'session:session-1',
          src: 'session',
          input: {
            now: () => Date.now(),
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
