import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { StatusIndicator } from '#lib/product/status-indicator/status-indicator';
import { SessionLogo } from './session-row-logo';
import { markSurface } from './session-row-metadata';
import type { SessionRowProps } from './session-row-props';

type SessionMarkProps = Pick<SessionRowProps, 'session' | 'logo'> & {
  selected: boolean;
};

// The Agent's logo with the Session's status dot on its corner.
export function SessionMark(props: SessionMarkProps): React.JSX.Element {
  return (
    <View className="relative size-6 shrink-0 items-center justify-center wide:size-5">
      <SessionLogo logo={props.logo} status={props.session.status} />
      <StatusIndicator
        testID="session-status"
        status={props.session.status}
        className={cn(
          'absolute -right-0.5 -top-px wide:-top-0.5',
          markSurface(props.selected),
        )}
      />
    </View>
  );
}
