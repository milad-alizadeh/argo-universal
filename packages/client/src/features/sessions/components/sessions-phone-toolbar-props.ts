import type { SessionsFilter } from '../state/sessions-filter';

export interface SessionsPhoneToolbarProps extends SessionsFilter {
  onNewSession: () => void;
}
