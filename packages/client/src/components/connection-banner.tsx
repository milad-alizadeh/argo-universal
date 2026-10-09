import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { useConnectionState } from '../connection/context';

// Says so while the Connection is down; Server data on screen may be stale until it reopens.
export function ConnectionBanner(): React.JSX.Element | null {
  const state = useConnectionState();
  if (state !== 'reconnecting' && state !== 'offline') return null;
  return (
    <View role="status" className="w-full bg-muted px-4 py-2">
      <Text className="text-center type-secondary">
        {state === 'reconnecting'
          ? 'Reconnecting to the Server…'
          : 'The Server is offline. Argo keeps trying to reconnect.'}
      </Text>
    </View>
  );
}
