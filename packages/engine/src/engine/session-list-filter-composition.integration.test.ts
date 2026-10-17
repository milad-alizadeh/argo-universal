import { expect, it, onTestFinished } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it('lists only top-level Sessions, searches literal titles, filters archives, lists both with no filter and pages tied activity', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({
    title: 'Earlier',
    activityAt: 1,
  });

  insertEndedTurn(database);
  onTestFinished(remove);

  for (let index = 0; index < 51; index += 1) {
    const id = `page-${String(index).padStart(2, '0')}`;
    insertSession(database, {
      id,
      title: 'Search %_ title',
      activityAt: 10,
    });
    insertEndedTurn(database, id);
  }

  insertSession(database, {
    id: 'archived',
    title: 'Archived title',
    archivedAt: 2,
    activityAt: 20,
  });
  insertEndedTurn(database, 'archived');
  insertSession(database, {
    id: 'subagent',
    parentSessionId: 'session-1',
    title: 'Search %_ title',
    activityAt: 30,
  });
  insertEndedTurn(database, 'subagent');

  const { createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });

  const caller = createCaller();
  const first = await caller.session.list({ archived: false, query: '%_' });
  expect(first.sessions).toHaveLength(50);
  expect(first.sessions[0]).toMatchObject({ sessionId: 'page-50' });
  expect(first.nextCursor).not.toBeNull();

  const second = await caller.session.list({
    archived: false,
    query: '%_',
    cursor: first.nextCursor ?? undefined,
  });

  expect(second.sessions.map((row): string => row.sessionId)).toEqual([
    'page-00',
  ]);
  expect(second.nextCursor).toBeNull();
  expect(
    (await caller.session.list({ archived: true })).sessions.map(
      (row): string => row.sessionId,
    ),
  ).toEqual(['archived']);
  expect(
    (await caller.session.list({ query: 'title' })).sessions
      .map((row): string => row.sessionId)
      .slice(0, 2),
  ).toEqual(['archived', 'page-50']);
  expect(
    (await caller.session.list({ archived: false, projectId: 'missing' }))
      .sessions,
  ).toEqual([]);
  await expect(
    caller.session.list({ archived: false, cursor: 'bad' }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

const nextPage = (page: { nextCursor: string | null }): string | undefined =>
  page.nextCursor ?? undefined;

it('pages Created order newest created first, apart from activity, and rejects an activity cursor for it', async (): Promise<void> => {
  const { database, remove } = openTestDatabase({
    createdAt: 0,
    activityAt: 100,
  });

  insertEndedTurn(database);
  onTestFinished(remove);

  // Created later, active earlier: the two orders run in opposite directions.
  for (let index = 1; index <= 50; index += 1) {
    const id = `created-${String(index).padStart(2, '0')}`;
    insertSession(database, { id, createdAt: index, activityAt: 100 - index });
    insertEndedTurn(database, id);
  }

  const { createCaller } = await startEngineTestHost({
    database,
    ...scriptedEngineInput(),
  });

  const caller = createCaller();
  const first = await caller.session.list({ order: 'created' });
  expect(first.sessions).toHaveLength(50);
  expect(first.sessions[0]).toMatchObject({ sessionId: 'created-50' });

  const second = await caller.session.list({
    order: 'created',
    cursor: first.nextCursor ?? undefined,
  });

  expect(second.sessions.map((row): string => row.sessionId)).toEqual([
    'session-1',
  ]);
  expect(second.nextCursor).toBeNull();

  const byActivity = await caller.session.list({});
  expect(byActivity.sessions[0]).toMatchObject({ sessionId: 'session-1' });
  await expect(
    caller.session.list({ order: 'created', cursor: nextPage(byActivity) }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
