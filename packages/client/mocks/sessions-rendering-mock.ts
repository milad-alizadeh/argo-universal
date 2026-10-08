import { sessionRows } from '@repo/api/mocks';

export const renderingSessions = [
  {
    ...sessionRows.idle,
    sessionId: 'memo-unchanged',
    title: 'Unchanged Session',
    activityAt: 300,
  },
  {
    ...sessionRows.idle,
    sessionId: 'memo-selectable',
    title: 'Selectable Session',
    activityAt: 200,
  },
  {
    ...sessionRows.idle,
    sessionId: 'memo-updated',
    title: 'Updated Session',
    activityAt: 100,
  },
];
