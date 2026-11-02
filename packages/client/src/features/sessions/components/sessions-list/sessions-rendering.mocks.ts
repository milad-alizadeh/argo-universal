import { sessionRows } from '@repo/mocks/app';

export const renderingSessions = [
  {
    ...sessionRows.idle,
    sessionId: 'memo-unchanged',
    title: 'Unchanged Session',
    activityAt: 300,
    createdAt: 300,
  },
  {
    ...sessionRows.idle,
    sessionId: 'memo-selectable',
    title: 'Selectable Session',
    activityAt: 200,
    createdAt: 200,
  },
  {
    ...sessionRows.idle,
    sessionId: 'memo-updated',
    title: 'Updated Session',
    activityAt: 100,
    createdAt: 100,
  },
];
