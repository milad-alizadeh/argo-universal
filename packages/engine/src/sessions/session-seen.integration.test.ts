import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { insertEndedTurn } from '#mocks/database';

// `session-1` with an ended Turn and three Feed revisions, none of them seen.
async function startUnreadSession(): ReturnType<typeof startAcpEngine> {
  const engine = await startAcpEngine({ steps: [] });
  insertEndedTurn(engine.database);
  engine.database
    .update(session)
    .set({ maxRevision: 3 })
    .where(eq(session.id, 'session-1'))
    .run();

  return engine;
}

it('clears Unread and its attention count once the end of the Feed is seen', async (): Promise<void> => {
  const { caller, createCaller } = await startUnreadSession();
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());

  const counts = (
    await createCaller({ signal: controller.signal }).session.counts()
  )[Symbol.asyncIterator]();

  expect((await counts.next()).value).toMatchObject({ attention: 1 });
  await caller.session.markSeen({ sessionId: 'session-1', revision: 3 });
  expect((await counts.next()).value).toMatchObject({ attention: 0 });
  expect(
    (await caller.session.list({ archived: false })).sessions,
  ).toMatchObject([{ sessionId: 'session-1', status: 'idle' }]);
});

it.each([
  { seen: [3, 1], stored: 3, status: 'idle' },
  { seen: [1, 2], stored: 2, status: 'unread' },
])(
  'keeps the newest revision seen after $seen',
  async ({ seen, stored, status }): Promise<void> => {
    const { caller, database } = await startUnreadSession();

    for (const revision of seen)
      await caller.session.markSeen({ sessionId: 'session-1', revision });

    expect(
      database
        .select({ seenRevision: session.seenRevision })
        .from(session)
        .where(eq(session.id, 'session-1'))
        .get(),
    ).toEqual({ seenRevision: stored });
    expect(
      (await caller.session.list({ archived: false })).sessions,
    ).toMatchObject([{ sessionId: 'session-1', status }]);
  },
);

it('refuses to mark an unknown Session seen', async (): Promise<void> => {
  const { caller } = await startUnreadSession();

  await expect(
    caller.session.markSeen({ sessionId: 'missing', revision: 1 }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
