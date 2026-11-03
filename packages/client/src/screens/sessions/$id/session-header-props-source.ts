import type { SessionSnapshot } from '@repo/contracts';
import type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from '#features/sessions';
import type { OpenSession } from './session-composer-props';

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

// The menu's Rename and Archive come from the page, which also draws the dialogs they open.
export const sessionHeaderProps = ({
  sessionId,
  snapshot,
}: OpenSession): SessionHeaderProps => ({
  sessionId,
  title: snapshot.title,
  status: headerStatus[snapshot.state],
  startedAt: snapshot.liveHeader?.startedAt ?? null,
  menu: {
    archived: snapshot.archivedAt !== null,
    status: headerStatus[snapshot.state],
  },
});
