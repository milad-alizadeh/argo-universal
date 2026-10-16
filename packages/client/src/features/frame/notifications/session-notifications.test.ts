import type {
  FeedPageOutput,
  SessionInfo,
  SessionStatus,
  SessionUpdate,
  StopReason,
} from '@repo/contracts';
import { expect, test } from 'vitest';
import { type NotificationBaseline } from './notification-feed';
import {
  notificationBaseline,
  sessionNotifications as projectNotifications,
  type SessionNotification,
} from './session-notifications';
import {
  session,
  end,
  page,
  endedPage,
  baseline,
  withStatus,
  turnEndedBody,
  read,
} from './session-notifications.test.mocks';

const sessionNotifications = (
  previous: NotificationBaseline | undefined,
  session: SessionInfo,
  page: FeedPageOutput,
): SessionNotification[] => projectNotifications(previous, read(session, page));

const bodies = (notices: ReturnType<typeof sessionNotifications>): string[] =>
  notices.map((notice) => notice.body);

test('initial history establishes its Feed position and replaying it stays quiet', () => {
  const initial = notificationBaseline(read(session, endedPage));
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

test('distinct request IDs notify despite consecutive needs_input projections', () => {
  const waiting = withStatus('needs_input');
  const previous = { ...baseline, session: waiting, inputId: 'first' };
  expect(
    bodies(projectNotifications(previous, read(waiting, page([]), 'second'))),
  ).toEqual(['Needs your input']);
  expect(
    projectNotifications(previous, read(waiting, page([]), 'first')),
  ).toEqual([]);
  expect(projectNotifications(previous, read(waiting, page([]), null))).toEqual(
    [],
  );
});

test('reconnect replay and unrelated activity do not repeat a delivered ending', () => {
  const delivered = notificationBaseline(read(session, endedPage));
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
