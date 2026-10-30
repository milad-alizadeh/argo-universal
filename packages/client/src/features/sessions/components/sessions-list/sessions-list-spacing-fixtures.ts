import { sessionRows } from '@repo/mocks/app';
import { nestedSessions } from './sessions-list-nested-fixtures';
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

// Every status in one list, so each status accessory is drawn beside a logo: the spinning logo, the dot and the age.
export const statusSessions = {
  ...flatSessions,
  sessions: [
    { ...sessionRows.running, agent: 'agent-two' },
    sessionRows.failed,
    { ...sessionRows.idle, agent: 'agent-two' },
    ...flatSessions.sessions,
  ],
};

// The same Sessions as one Compact line each.
export const compactStatusSessions = {
  ...statusSessions,
  view: { ...statusSessions.view, layout: 'compact' as const },
};

// A group holding delegated work keeps one tree lane for every top-level row, so a childless Session lines up with a parent.
export const mixedSessions = {
  ...nestedSessions,
  sessions: [
    ...nestedSessions.sessions,
    { ...sessionRows.unread, title: 'Standalone Session', activityAt: 400 },
  ],
};
