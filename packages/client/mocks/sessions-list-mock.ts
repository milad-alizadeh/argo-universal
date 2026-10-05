import {
  activeSessions,
  agentsList,
  projectsList,
  sessionRows,
} from '@repo/api/mocks';
import { sessionListMocks } from './session-list-mock';
import { type Fixtures, pending } from './trpc-mock-link';

export const sessionsListProps = {
  projects: projectsList,
  agents: agentsList,
  sessions: activeSessions.sessions,
  query: '',
  archived: false,
};
const project = projectsList[0];
if (!project) throw new Error('Missing Project mock');
export const multipleProjects = [
  ...projectsList,
  { ...project, id: 'project-empty', name: 'Empty Project' },
];
export const largeSessions = Array.from({ length: 2000 }, (_, index) => ({
  ...sessionRows.idle,
  sessionId: `large-${index}`,
  title: `Large Session ${index}`,
  activityAt: 2000 - index,
}));
export const largeSessionListMocks = {
  ...sessionListMocks,
  'session.list': () => ({ sessions: largeSessions, nextCursor: null }),
} satisfies Fixtures;
export const multipleProjectsMocks = {
  ...sessionListMocks,
  'projects.list': () => multipleProjects,
} satisfies Fixtures;
export const nextPageFailureMocks = {
  ...sessionListMocks,
  'session.list': ({ cursor }) => {
    if (cursor) throw new Error('Next page unavailable');
    return { sessions: [sessionRows.running], nextCursor: 'next-page' };
  },
} satisfies Fixtures;

const firstPageSessions = [sessionRows.running, sessionRows.idle];
export const nextPageLoadingMocks = {
  ...sessionListMocks,
  'session.list': ({ cursor }) =>
    cursor
      ? pending()()
      : { sessions: firstPageSessions, nextCursor: 'next-page' },
} satisfies Fixtures;
