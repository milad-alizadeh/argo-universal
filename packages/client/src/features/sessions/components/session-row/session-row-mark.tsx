import type * as React from 'react';
import { Avatar } from '#primitives/content/avatar';
import { SessionLogo } from './session-row-logo';
import type { SessionRowProps } from './session-row-props';

type SessionMarkProps = Pick<SessionRowProps, 'session' | 'logo'>;

// The Agent's logo alone; the Session's status dot ends the row.
export function SessionMark(props: SessionMarkProps): React.JSX.Element {
  return (
    <Avatar initials="AG" accessibilityLabel="Agent" decorative size="sm">
      <SessionLogo logo={props.logo} status={props.session.status} />
    </Avatar>
  );
}
