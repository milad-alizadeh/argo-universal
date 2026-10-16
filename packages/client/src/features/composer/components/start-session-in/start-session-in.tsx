import type * as React from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { ServerLocation } from './server-location';
import { SessionAgentControl } from './session-agent-control';
import { SessionCheckoutControl } from './session-checkout-control';
import { SessionProjectControl } from './session-project-control';
import type { StartSessionInProps } from './start-session-types';

export type { StartSessionInProps } from './start-session-types';

export function StartSessionIn(props: StartSessionInProps): React.JSX.Element {
  const wide = useContentWide();

  return (
    <View {...startLocationProps(wide)}>
      <ServerLocation
        name={props.serverName}
        connected={props.serverConnected}
      />
      <SessionProjectControl props={props} wide={wide} />
      {!wide && <SessionCheckoutControl {...props} />}
      <SessionAgentControl props={props} wide={wide} />
    </View>
  );
}

function startLocationProps(wide: boolean): React.ComponentProps<typeof View> {
  return {
    accessibilityLabel: 'Start the Session in',
    className: wide ? 'flex-row items-center justify-center gap-4' : 'w-full',
  };
}
