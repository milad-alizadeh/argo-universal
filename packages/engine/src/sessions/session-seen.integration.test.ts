import type { SessionStatus } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it.each<{ seenRevision: number; revision: number; status: SessionStatus }>([
  { seenRevision: 0, revision: 5, status: 'idle' },
  { seenRevision: 0, revision: 4, status: 'unread' },
  { seenRevision: 4, revision: 2, status: 'unread' },
])(
  'lists a Session with Feed revision 5, seen up to $seenRevision, as $status after the App sees revision $revision',
  async ({ seenRevision, revision, status }): Promise<void> => {
    const { database, remove } = openTestDatabase({
      maxRevision: 5,
      seenRevision,
    });
    onTestFinished(remove);
    const { caller } = await startEngineTestHost({
      database,
      ...scriptedEngineInput(),
    });
    await caller.session.markSeen({ sessionId: 'session-1', revision });
    expect(
      (await caller.session.list({ archived: false })).sessions,
    ).toMatchObject([{ sessionId: 'session-1', status }]);
  },
);
