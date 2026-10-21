import { defaultSessionsView } from '../stores/sessions-view';
import type { SessionsHeaderProps } from './sessions-header';

// A story supplies the callbacks; a fixture is the search and the view the header shows.
type SessionsHeaderFixture = Omit<
  SessionsHeaderProps,
  'onQueryChange' | 'onViewChange' | 'onNewSession'
>;

export const sessionsHeader = {
  query: '',
  view: defaultSessionsView,
} satisfies SessionsHeaderFixture;
