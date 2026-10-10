import type { SessionCounts } from '@repo/contracts';
import {
  activeSessions,
  agentsList,
  archivedSessions,
  projectsList,
  sessionRows,
} from '@repo/mocks/app';
import type { FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

// Shared procedure mocks for Session list screen stories (ADR 0010).
export const sessionListMocks = {
  'projects.list': (): typeof projectsList => projectsList,
  'agents.list': (): typeof agentsList => agentsList,
  'session.list': ({ archived, query }): FixtureOutput<'session.list'> => {
    if (archived) return archivedSessions;
    if (!query) return activeSessions;
    if (query === 'settings')
      return {
        sessions: agentsList.map(({ agent }) => ({
          ...sessionRows.running,
          agent,
          sessionId: `${agent}:${sessionRows.running.sessionId}`,
        })),
        nextCursor: null,
      };
    return { sessions: [], nextCursor: null };
  },
  'session.listUpdates': async function* (): AsyncGenerator<never, void> {},
  'session.counts': async function* (): AsyncGenerator<SessionCounts, void> {
    yield { attention: 4, running: 8 };
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
