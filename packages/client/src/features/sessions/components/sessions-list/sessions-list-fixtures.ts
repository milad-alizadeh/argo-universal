import type { SessionsListProps } from './sessions-list';
import {
  largeSessions,
  multipleProjects,
  sessionsListProps,
} from './sessions-list.mocks';

// A story supplies the callbacks; a fixture is the Projects, the Sessions and the view they are listed in.
type SessionsListFixture = Omit<
  SessionsListProps,
  | 'onSelect'
  | 'onStartSession'
  | 'onRename'
  | 'onArchive'
  | 'onEndReached'
  | 'onNewSession'
  | 'onProjectSettings'
>;

export const sessionsByProject = {
  ...sessionsListProps,
} satisfies SessionsListFixture;

// Every Project keeps its heading, so one with no Sessions shows its own empty line.
export const projectWithoutSessions = {
  ...sessionsListProps,
  projects: multipleProjects,
  sessions: sessionsListProps.sessions.slice(0, 2),
} satisfies SessionsListFixture;

export const noProjects = {
  ...sessionsListProps,
  projects: [],
} satisfies SessionsListFixture;

export const noMatchingSessions = {
  ...sessionsListProps,
  query: 'xyz',
  sessions: [],
} satisfies SessionsListFixture;

export const noArchivedSessions = {
  ...sessionsListProps,
  view: { ...sessionsListProps.view, status: 'archived' },
  sessions: [],
} satisfies SessionsListFixture;

// Enough Sessions to scroll the virtualized list.
export const manySessions = {
  ...sessionsListProps,
  sessions: largeSessions.slice(0, 12),
} satisfies SessionsListFixture;
