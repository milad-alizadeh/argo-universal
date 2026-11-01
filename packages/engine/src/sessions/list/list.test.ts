import { type SessionInfo, SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { sessionListPage } from './session-list-page';

it.each([
  { archived: false },
  { archived: false, direction: 'forward' },
  // No `archived` lists active and archived Sessions both.
  {},
])('accepts the Session list paging mock %j', (pagingInput): void => {
  expect(SessionListInput.parse(pagingInput)).toEqual(pagingInput);
});

it.each([
  { direction: 'backward' },
  { unexpected: true },
  // The list always orders by creation time, so it takes no order.
  { order: 'created' },
])('rejects unsupported paging mock fields %j', (pagingInput): void => {
  expect(
    SessionListInput.safeParse({ archived: false, ...pagingInput }).success,
  ).toBe(false);
});

// A listed Session; the later its index, the earlier its creation.
function listedSession(index: number): SessionInfo {
  const id = `session-${String(index).padStart(2, '0')}`;

  return {
    sessionId: id,
    projectId: 'project-1',
    agent: 'mock',
    parentSessionId: null,
    startedBySessionId: null,
    updatedAt: index,
    cwd: '/project',
    status: 'idle',
    title: id,
    titleSource: 'agent',
    activity: '',
    activityAt: index,
    createdAt: 100 - index,
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

it('pages most recently active first across pages', (): void => {
  const page = sessionListPage({}, readRows);

  expect(page.sessions).toHaveLength(50);
  expect(page.sessions[0]?.sessionId).toBe('session-00');

  const next = sessionListPage(
    { cursor: page.nextCursor ?? undefined },
    readRows,
  );

  expect(ids(next.sessions)).toEqual(['session-50']);
  expect(next.nextCursor).toBeNull();
});

it.each([
  ['not base64 JSON', 'bad'],
  [
    'a cursor of another shape',
    Buffer.from(JSON.stringify({ at: 51, sessionId: 'session-49' })).toString(
      'base64url',
    ),
  ],
])('rejects a cursor that is %s', (_case, cursor): void => {
  expect(() => sessionListPage({ cursor }, readRows)).toThrow(
    'Invalid Session list cursor',
  );
});
