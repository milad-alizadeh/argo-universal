import {
  activeSessions,
  agentsList,
  projectsList,
  sessionRows,
} from '@repo/mocks/app';
import { sessionListMocks } from './session-list-mock';
import type { FixtureOutput } from './trpc-mock-link';
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
  'session.list': (): Omit<FixtureOutput<'session.list'>, 'nextCursor'> & {
    nextCursor: null;
  } => ({ sessions: largeSessions, nextCursor: null }),
} satisfies Fixtures;
export const multipleProjectsMocks = {
  ...sessionListMocks,
  'projects.list': (): typeof multipleProjects => multipleProjects,
} satisfies Fixtures;
export const nextPageFailureMocks = {
  ...sessionListMocks,
  'session.list': ({
    cursor,
  }): { sessions: (typeof sessionRows.running)[]; nextCursor: string } => {
    if (cursor) throw new Error('Next page unavailable');
    return { sessions: [sessionRows.running], nextCursor: 'next-page' };
  },
} satisfies Fixtures;

const firstPageSessions = [sessionRows.running, sessionRows.idle];
export const nextPageLoadingMocks = {
  ...sessionListMocks,
  'session.list': ({
    cursor,
  }): FixtureOutput<'session.list'> | Promise<FixtureOutput<'session.list'>> =>
    cursor
      ? pending()()
      : { sessions: firstPageSessions, nextCursor: 'next-page' },
} satisfies Fixtures;

export const streamingSessionCatalogs = agentsList.map((agent) => {
  const row = activeSessions.sessions.find(
    (session) => session.agent === agent.agent && session.status === 'idle',
  );
  if (!row)
    throw new Error(
      `Recorded catalog needs an idle Session for ${agent.label}.`,
    );
  return {
    row,
    pages: Array.from({ length: 60 }, (_, index) => ({
      ...row,
      sessionId: `${row.sessionId}:page-${index}`,
      title: `${agent.label} Session ${index}`,
      activityAt: row.activityAt + 60 - index,
    })),
  };
});
if (streamingSessionCatalogs.length !== 2)
  throw new Error('Recorded catalog needs both Agents for streaming lists.');
