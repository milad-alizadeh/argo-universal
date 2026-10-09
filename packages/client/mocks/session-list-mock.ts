import type { SessionCounts } from '@repo/contracts';
import {
  activeSessions,
  agentsList,
  archivedSessions,
  projectsList,
} from '@repo/mocks/app';
import type { FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

// Shared procedure mocks for Session list screen stories (ADR 0010).
export const sessionListMocks = {
  'projects.list': (): typeof projectsList => projectsList,
  'agents.list': (): typeof agentsList => agentsList,
  'session.list': ({
    projectId,
    archived,
    query,
  }): FixtureOutput<'session.list'> => {
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
  'session.listUpdates': async function* (): AsyncGenerator<never, void> {},
  'session.counts': async function* (): AsyncGenerator<SessionCounts, void> {
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
  'session.list': (): { sessions: never[]; nextCursor: null } => ({
    sessions: [],
    nextCursor: null,
  }),
  'session.counts': async function* (): AsyncGenerator<SessionCounts, void> {
    yield { attention: 0, running: 0 };
  },
} satisfies Fixtures;
