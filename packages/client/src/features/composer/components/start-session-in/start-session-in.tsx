import type * as React from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { ServerLocation } from './server-location';
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
    </View>
  );
}

function startLocationProps(wide: boolean): React.ComponentProps<typeof View> {
  return {
    accessibilityLabel: 'Start the Session in',
    className: wide
      ? 'w-full max-w-column flex-row items-center gap-4 pl-2.5'
      : 'w-full',
  };
}
