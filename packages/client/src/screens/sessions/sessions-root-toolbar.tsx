import type { SessionsViewState } from '#features/sessions';

export interface SessionsRootToolbarProps extends SessionsViewState {
  onNewSession: () => void;
}

// Only iOS's stack header takes stock items here; Android's drawer header and the web's JS header draw the root's header props.
export function SessionsRootToolbar(_props: SessionsRootToolbarProps): null {
  return null;
}
