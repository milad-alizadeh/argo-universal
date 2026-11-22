import { leadingMarkClass } from '@repo/kit/leading-mark';
import type * as React from 'react';
import { View } from 'react-native';
import { SessionLogo } from './session-row-logo';
import type { SessionRowProps } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

type SessionMarkProps = Pick<SessionRowProps, 'session' | 'logo'>;

// The Agent's logo alone; the Session's status dot ends the row. A sidebar row draws the bare logo, a phone's sits on the row's leading mark plate, the size of a Settings row's icon.
export function SessionMark(props: SessionMarkProps): React.JSX.Element {
  const status = props.session.status;

  if (sidebarRows)
    return <SessionLogo logo={props.logo} status={status} size="sm" />;

  return (
    <View
      aria-hidden
      className={`${leadingMarkClass} items-center justify-center overflow-hidden rounded-full bg-muted`}
    >
      <SessionLogo logo={props.logo} status={status} size="md" />
    </View>
  );
}
