import type {
  SessionInfo,
  SessionListUpdate,
  SessionStatus,
} from '@repo/contracts';
import { activeSessions } from '@repo/mocks/app';
import { expect, test } from 'vitest';
import { createSessionNotifications } from './session-notifications';

const session = activeSessions.sessions[0];

if (!session) throw new Error('Expected a Session fixture');

const changed = (
  status: SessionStatus,
  changes: Partial<SessionInfo> = {},
): SessionListUpdate => ({
  type: 'changed',
  session: { ...session, status, ...changes },
});

test.each<SessionStatus>([
  'idle',
  'unread',
  'failed',
  'needs_input',
  'running',
])(
  'the initial %s projection establishes a baseline without replaying history',
  (status) => {
    expect(createSessionNotifications().receive(changed(status))).toBeNull();
  },
);

test('an input request notifies once, even as its activity changes, and answering resumes without ending the Turn', () => {
  const notifications = createSessionNotifications();
  notifications.receive(changed('running'));
  expect(notifications.receive(changed('needs_input'))?.body).toBe(
    'Needs your input',
  );
  expect(
    notifications.receive(
      changed('needs_input', { activity: 'Waiting for permission' }),
    ),
  ).toBeNull();
  expect(notifications.receive(changed('running'))).toBeNull();
  expect(notifications.receive(changed('needs_input'))?.body).toBe(
    'Needs your input',
  );
});

test.each<{ previous: SessionStatus; next: SessionStatus }>([
  { previous: 'running', next: 'unread' },
  { previous: 'running', next: 'idle' },
  { previous: 'running', next: 'failed' },
  { previous: 'needs_input', next: 'unread' },
  { previous: 'needs_input', next: 'idle' },
  { previous: 'needs_input', next: 'failed' },
])(
  'an observed $previous Turn ending as $next notifies once',
  ({ previous, next }) => {
    const notifications = createSessionNotifications();
    notifications.receive(changed(previous));
    expect(notifications.receive(changed(next))?.body).toBe('Turn ended');
    expect(notifications.receive(changed(next))).toBeNull();
    expect(notifications.receive(changed('idle'))).toBeNull();
  },
);

test('reconnecting suppresses historical endings and still observes a running Turn after the new baseline', () => {
  const notifications = createSessionNotifications();
  notifications.receive(changed('running'));
  notifications.reset();
  expect(notifications.receive(changed('unread'))).toBeNull();
  notifications.receive(changed('running'));
  expect(notifications.receive(changed('unread'))?.body).toBe('Turn ended');
});

test.each<Partial<SessionInfo>>([
  { archivedAt: 1 },
  { parentSessionId: 'parent' },
])('archived Sessions and Subagents do not notify', (changes) => {
  const notifications = createSessionNotifications();
  notifications.receive(changed('running', changes));
  expect(notifications.receive(changed('needs_input', changes))).toBeNull();
  expect(notifications.receive(changed('unread', changes))).toBeNull();
});

test('a removed Session loses its baseline before it reappears', () => {
  const notifications = createSessionNotifications();
  notifications.receive(changed('running'));
  expect(
    notifications.receive({ type: 'removed', sessionId: session.sessionId }),
  ).toBeNull();
  expect(notifications.receive(changed('unread'))).toBeNull();
});
