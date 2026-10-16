import type {
  FeedPageOutput,
  SessionInfo,
  SessionStatus,
  SessionUpdate,
  Notice,
} from '@repo/contracts';
import { activeSessions } from '@repo/mocks/app';
import type { NotificationBaseline } from './notification-feed';
import type { SessionNotificationRead } from './session-notifications';

const fixture = activeSessions.sessions[0];

if (!fixture) throw new Error('Expected a Session fixture');

export const session: SessionInfo = { ...fixture, status: 'idle' };

export const turnEndedBody = 'Turn ended';

export const end: Notice = {
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

export const page = (rows: SessionUpdate[]): FeedPageOutput => ({
  epoch: 0,
  maxRevision: 100,
  rows,
  hasOlder: false,
  startCursor: rows[0]?.position ?? null,
  staleCursor: false,
});

export const endedPage = page([{ ...end, position: 10 }]);

export const baseline: NotificationBaseline = {
  session,
  epoch: 0,
  position: 0,
  inputId: null,
};

export const withStatus = (status: SessionStatus): SessionInfo => ({
  ...session,
  status,
});

export const read = (
  session: SessionInfo,
  page: FeedPageOutput,
  inputId: string | null = session.status === 'needs_input' ? 'request' : null,
): SessionNotificationRead => ({ session, page, inputId });
