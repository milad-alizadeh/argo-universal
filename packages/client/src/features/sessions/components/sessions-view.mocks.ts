import { activeSessions, agentsList, projectsList } from '@repo/mocks/app';
import type { SessionsViewProps } from './sessions-view';

// The loaded list with nothing wrong, to be varied one prop at a time.
export const loadedSessionsView = {
  loadState: 'ready',
  connection: 'open',
  liveUpdatesStopped: false,
  loadMoreFailed: false,
  isFetchingNextPage: false,
  projects: projectsList,
  agents: agentsList,
  sessions: activeSessions.sessions,
  query: '',
  archived: false,
} satisfies Partial<SessionsViewProps>;
