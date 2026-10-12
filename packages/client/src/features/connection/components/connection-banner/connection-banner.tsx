import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { ConnectionState } from '../../state/context';

// Says so while the Connection is down; Server data on screen may be stale until it reopens. A wide window lays it over the top of the pane, so the page under it never moves.
export function ConnectionBanner({
  state,
}: {
  state: ConnectionState;
}): React.JSX.Element | null {
  const wide = useWide();
  if (state !== 'reconnecting' && state !== 'offline') return null;
  return (
    <View
      role="status"
      className={
        wide
          ? 'absolute inset-x-0 top-0 z-10 bg-muted px-4 py-2'
          : 'w-full bg-muted px-4 py-2'
      }
    >
      <Text role="secondary" className="text-center">
        {state === 'reconnecting'
          ? 'Reconnecting to the Server…'
          : 'The Server is offline. Argo keeps trying to reconnect.'}
      </Text>
    </View>
  );
}
