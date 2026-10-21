import { Avatar } from '@repo/kit/primitives/content/avatar';
import type * as React from 'react';
import { SessionLogo } from './session-row-logo';
import type { SessionRowProps } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

type SessionMarkProps = Pick<SessionRowProps, 'session' | 'logo'>;

// The Agent's logo alone; the Session's status dot ends the row. A sidebar row draws the bare logo, a phone's sits on an Avatar.
export function SessionMark(props: SessionMarkProps): React.JSX.Element {
  const logo = <SessionLogo logo={props.logo} status={props.session.status} />;

  if (sidebarRows) return logo;

  return (
    <Avatar initials="AG" accessibilityLabel="Agent" decorative size="sm">
      {logo}
    </Avatar>
  );
}
