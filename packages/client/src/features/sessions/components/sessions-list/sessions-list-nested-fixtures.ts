import { sessionRows } from '@repo/mocks/app';
import { sessionsListProps } from './sessions-list.mocks';

export const parent = {
  ...sessionRows.idle,
  sessionId: 'parent',
  title: 'Investigate the regression',
  activityAt: 100,
};

const child = {
  ...parent,
  sessionId: 'started',
  title: 'Review the change',
  startedBySessionId: parent.sessionId,
  activityAt: 300,
};

const descendant = {
  ...child,
  sessionId: 'descendant',
  title: 'Check the edge cases',
  startedBySessionId: child.sessionId,
  activityAt: 200,
};

export const nestedSessions = {
  ...sessionsListProps,
  sessions: [child, parent, descendant],
};

export const orphanSessions = {
  ...nestedSessions,
  query: 'Review',
  sessions: [child],
};
