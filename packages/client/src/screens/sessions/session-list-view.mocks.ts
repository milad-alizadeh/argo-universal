import { activeSessions, agentsList, projectsList } from '@repo/mocks/app';
import { defaultSessionsView } from '#features/session-list';
import type { SessionListViewProps } from './session-list-view';

// The loaded list with nothing wrong, to be varied one prop at a time.
export const loadedSessionListView = {
  loadState: 'ready',
  liveUpdatesStopped: false,
  loadMoreFailed: false,
  isFetchingNextPage: false,
  projects: projectsList,
  agents: agentsList,
  sessions: activeSessions.sessions,
  query: '',
  view: defaultSessionsView,
} satisfies Partial<SessionListViewProps>;
