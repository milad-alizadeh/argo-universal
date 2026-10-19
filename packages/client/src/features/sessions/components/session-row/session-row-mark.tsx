import type * as React from 'react';
import { Avatar } from '#primitives/content/avatar';
import {
  sessionStatusDot,
  sessionStatusLabels,
} from '../../session-status-dot';
import { SessionLogo } from './session-row-logo';
import type { SessionRowProps } from './session-row-props';

type SessionMarkProps = Pick<SessionRowProps, 'session' | 'logo'> & {
  selected: boolean;
};

// The Agent's logo with the Session's status dot on its corner.
export function SessionMark(props: SessionMarkProps): React.JSX.Element {
  return (
    <Avatar {...sessionAvatarProps(props)}>
      <SessionLogo logo={props.logo} status={props.session.status} />
    </Avatar>
  );
}

function sessionAvatarProps(
  props: SessionMarkProps,
): React.ComponentProps<typeof Avatar> {
  const statusLabel = sessionStatusLabels[props.session.status];

  return {
    initials: 'AG',
    accessibilityLabel: `Agent, ${statusLabel}`,
    decorative: true,
    size: 'sm',
    status: sessionAvatarStatus(props, statusLabel),
    testID: 'session-status',
    statusSurface: props.selected ? 'selected' : 'card',
  };
}

function sessionAvatarStatus(
  props: SessionMarkProps,
  statusLabel: string,
): NonNullable<React.ComponentProps<typeof Avatar>['status']> {
  return {
    ...sessionStatusDot(props.session.status),
    accessibilityLabel: statusLabel,
  };
}
