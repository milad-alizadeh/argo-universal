import {
  activeSessions,
  agentsList,
  archivedSessions,
  projectsList,
} from '@repo/api/mocks';
import type { Fixtures } from './trpc-mock-link';

// Shared procedure mocks for Session list screen stories (ADR 0010).
export const sessionListMocks = {
  'projects.list': () => projectsList,
  'agents.list': () => agentsList,
  'session.list': ({ projectId, archived, query }) => {
    const list = archived ? archivedSessions : activeSessions;
    return {
      ...list,
      sessions: list.sessions.filter(
        (session) =>
          (!projectId || session.projectId === projectId) &&
          (!query || session.title.toLowerCase().includes(query.toLowerCase())),
      ),
    };
  },
  'session.listUpdates': async function* () {},
  'session.counts': async function* () {
    yield {
      attention: activeSessions.sessions.filter(
        (session) =>
          session.status === 'needs_input' || session.status === 'unread',
      ).length,
      running: activeSessions.sessions.filter(
        (session) => session.status === 'running',
      ).length,
    };
  },
} satisfies Fixtures;

export const emptySessionListMocks = {
  ...sessionListMocks,
  'session.list': () => ({ sessions: [], nextCursor: null }),
  'session.counts': async function* () {
    yield { attention: 0, running: 0 };
  },
} satisfies Fixtures;
