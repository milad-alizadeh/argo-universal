import { sessionRows } from '@repo/mocks/app';
import { sessionsListProps } from './sessions-list.mocks';

// A selected long title beside unread and waiting Sessions, with both Agent marks.
export const flatSessions = {
  ...sessionsListProps,
  sessions: [
    { ...sessionRows.longTitle, agent: 'agent-two' },
    sessionRows.unread,
    sessionRows.needsInput,
  ],
  selectedSessionId: sessionRows.longTitle.sessionId,
  view: { ...sessionsListProps.view, group: 'none' as const },
};
