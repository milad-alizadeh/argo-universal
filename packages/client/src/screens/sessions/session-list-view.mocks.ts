import { activeSessions, agentsList, projectsList } from '@repo/mocks/app';
import { defaultSessionsView } from '#features/sessions';
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

// Before the Server has sent any Project or Session: a load still going, and one that failed, alike.
export const loadingSessionListView = {
  projects: [],
  sessions: [],
} satisfies Partial<SessionListViewProps>;
