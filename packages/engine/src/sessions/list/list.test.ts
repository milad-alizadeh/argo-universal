import { type SessionInfo, SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { sessionListPage } from './session-list-page';

it.each([
  { archived: false },
  { archived: false, direction: 'forward' },
  // No `archived` lists active and archived Sessions both.
  {},
  { order: 'created' },
])('accepts the Session list paging mock %j', (pagingInput): void => {
  expect(SessionListInput.parse(pagingInput)).toEqual(pagingInput);
});

it.each([
  { direction: 'backward' },
  { unexpected: true },
  { order: 'priority' },
])('rejects unsupported paging mock fields %j', (pagingInput): void => {
  expect(
    SessionListInput.safeParse({ archived: false, ...pagingInput }).success,
  ).toBe(false);
});

// A listed Session whose creation and last activity run in opposite directions, so each order pages them differently.
function listedSession(index: number): SessionInfo {
  const id = `session-${String(index).padStart(2, '0')}`;

  return {
    sessionId: id,
    projectId: 'project-1',
    agent: 'mock',
    parentSessionId: null,
    createdAt: index,
    updatedAt: index,
    cwd: '/project',
    status: 'idle',
    title: id,
    titleSource: 'agent',
    activity: '',
    activityAt: 100 - index,
    checkout: { type: 'main', path: '/project', branch: null },
    plan: null,
    subagents: { running: 0, total: 0 },
    shells: { running: 0, total: 0 },
    archivedAt: null,
    pullRequest: null,
  };
}

const rows = Array.from({ length: 51 }, (_, index) => listedSession(index));

const readRows = (): SessionInfo[] => rows;

const ids = (sessions: SessionInfo[]): string[] =>
  sessions.map((row) => row.sessionId);

// The first-created Session is the last active, and the last created the first active.
const firstCreated = 'session-00';

const lastCreated = 'session-50';

it.each([
  { order: undefined, first: firstCreated, rest: [lastCreated] },
  { order: 'activity', first: firstCreated, rest: [lastCreated] },
  { order: 'created', first: lastCreated, rest: [firstCreated] },
] as const)(
  'pages the $order order newest first across pages',
  ({ order, first, rest }): void => {
    const page = sessionListPage({ order }, readRows);

    expect(page.sessions).toHaveLength(50);
    expect(page.sessions[0]?.sessionId).toBe(first);

    const next = sessionListPage(
      { order, cursor: page.nextCursor ?? undefined },
      readRows,
    );

    expect(ids(next.sessions)).toEqual(rest);
    expect(next.nextCursor).toBeNull();
  },
);

it('rejects a cursor from the other order', (): void => {
  const { nextCursor } = sessionListPage({ order: 'activity' }, readRows);

  expect(() =>
    sessionListPage(
      { order: 'created', cursor: nextCursor ?? undefined },
      readRows,
    ),
  ).toThrow('Invalid Session list cursor');
});

// A cursor as a Server from before `order` built it, after the activity order's first page.
const legacyCursor = Buffer.from(
  JSON.stringify({ activityAt: 51, sessionId: 'session-49' }),
).toString('base64url');

it('pages the activity order from a cursor from before `order`', (): void => {
  const next = sessionListPage({ cursor: legacyCursor }, readRows);

  expect(ids(next.sessions)).toEqual([lastCreated]);
});

it('rejects a cursor from before `order` for the Created order', (): void => {
  expect(() =>
    sessionListPage({ order: 'created', cursor: legacyCursor }, readRows),
  ).toThrow('Invalid Session list cursor');
});
