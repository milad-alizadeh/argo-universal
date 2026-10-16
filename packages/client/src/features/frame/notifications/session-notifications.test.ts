import type {
  FeedPageOutput,
  SessionInfo,
  SessionStatus,
  SessionUpdate,
  Notice,
  StopReason,
} from '@repo/contracts';
import { activeSessions } from '@repo/mocks/app';
import { expect, test } from 'vitest';
import { type NotificationBaseline } from './notification-feed';
import {
  notificationBaseline,
  sessionNotifications,
} from './session-notifications';

const fixture = activeSessions.sessions[0];

if (!fixture) throw new Error('Expected a Session fixture');

const session: SessionInfo = { ...fixture, status: 'idle' };

const turnEndedBody = 'Turn ended';

const end: Notice = {
  sessionUpdate: 'notice',
  sessionId: session.sessionId,
  id: 'turn:end',
  turnId: 'turn',
  position: 10,
  revision: 1,
  state: 'settled',
  severity: 'info',
  title: turnEndedBody,
  _meta: {
    argo: { turnEnd: { stopReason: 'end_turn', error: null, durationMs: 1 } },
  },
};

const page = (rows: SessionUpdate[]): FeedPageOutput => ({
  epoch: 0,
  maxRevision: 100,
  rows,
  hasOlder: false,
  startCursor: rows[0]?.position ?? null,
  staleCursor: false,
});

const endedPage = page([{ ...end, position: 10 }]);

const baseline: NotificationBaseline = { session, epoch: 0, position: 0 };

const withStatus = (status: SessionStatus): SessionInfo => ({
  ...session,
  status,
});

const bodies = (notices: ReturnType<typeof sessionNotifications>): string[] =>
  notices.map((notice) => notice.body);

test('initial history establishes its Feed position and replaying it stays quiet', () => {
  const initial = notificationBaseline(session, endedPage);
  expect(bodies(sessionNotifications(initial, session, endedPage))).toEqual([]);
});

test.each<SessionStatus>(['idle', 'unread', 'running', 'failed'])(
  'a fast Turn ending notifies even when the previous list projection was %s',
  (status) => {
    expect(
      bodies(
        sessionNotifications(
          { ...baseline, session: withStatus(status) },
          session,
          endedPage,
        ),
      ),
    ).toEqual([turnEndedBody]);
  },
);

test('a newly listed Session can have already completed its first Turn', () => {
  expect(bodies(sessionNotifications(undefined, session, endedPage))).toEqual([
    turnEndedBody,
  ]);
});

test('a newly listed input request notifies without a prior running projection', () => {
  expect(
    bodies(
      sessionNotifications(undefined, withStatus('needs_input'), page([])),
    ),
  ).toEqual(['Needs your input']);
});

test('an input request notifies once until the Session resumes', () => {
  const waiting = withStatus('needs_input');
  expect(bodies(sessionNotifications(baseline, waiting, page([])))).toEqual([
    'Needs your input',
  ]);
  expect(
    sessionNotifications({ ...baseline, session: waiting }, waiting, page([])),
  ).toEqual([]);
  expect(
    sessionNotifications(
      { ...baseline, session: waiting },
      withStatus('running'),
      page([]),
    ),
  ).toEqual([]);
});

test('reconnect replay and unrelated activity do not repeat a delivered ending', () => {
  const delivered = notificationBaseline(session, endedPage);
  expect(sessionNotifications(delivered, session, endedPage)).toEqual([]);
  expect(
    sessionNotifications(
      delivered,
      withStatus('unread'),
      page([...endedPage.rows, { ...end, position: 11, _meta: undefined }]),
    ),
  ).toEqual([]);
});

test.each<StopReason>([
  'end_turn',
  'cancelled',
  'error',
  'refusal',
  'max_tokens',
  'auth_required',
])('a %s ending uses the one durable Turn-end marker', (stopReason) => {
  const marker: SessionUpdate = {
    ...end,
    position: 10,
    _meta: { argo: { turnEnd: { stopReason, error: null, durationMs: 1 } } },
  };

  expect(
    bodies(sessionNotifications(baseline, session, page([marker]))),
  ).toEqual([turnEndedBody]);
});

test('a crash Notice without Turn-end metadata never creates a second notification', () => {
  const crashNotice = { ...end, position: 9, _meta: undefined };
  expect(
    bodies(
      sessionNotifications(
        baseline,
        session,
        page([crashNotice, ...endedPage.rows]),
      ),
    ),
  ).toEqual([turnEndedBody]);
});

test('an epoch change establishes a fresh position without replaying rebuilt history', () => {
  expect(
    sessionNotifications(baseline, session, { ...endedPage, epoch: 1 }),
  ).toEqual([]);
});

test.each<Partial<SessionInfo>>([
  { archivedAt: 1 },
  { parentSessionId: 'parent' },
])('archived Sessions and Subagents stay quiet', (changes) => {
  expect(
    sessionNotifications(baseline, { ...session, ...changes }, endedPage),
  ).toEqual([]);
});
