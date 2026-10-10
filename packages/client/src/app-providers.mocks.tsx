import type * as React from 'react';
import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppProviders } from './app-providers';
import { useTRPCClient } from './features/connection/trpc/context';
import {
  currentReport,
  recordScreenState,
  recordScreenSubscription,
  subscribe,
} from './websocket-report.mocks';

export interface ConnectionMockProps {
  strictMode?: boolean;
}

// Shows AppProviders' Connections over WebSocketMock; it starts unmounted, so StrictMode's double effects reach AppProviders.
export function ConnectionMock({
  strictMode = false,
}: ConnectionMockProps): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [serverUrl, setServerUrl] = useState('ws://127.0.0.1:7337');
  const current = useSyncExternalStore(subscribe, currentReport);
  const providers = mounted ? (
    <AppProviders serverUrl={serverUrl}>
      <ScreenMock />
    </AppProviders>
  ) : null;

  return (
    <View>
      <Pressable role="button" onPress={() => setMounted(!mounted)}>
        <Text>{mounted ? 'Unmount' : 'Mount'}</Text>
      </Pressable>
      <Pressable
        role="button"
        onPress={() => setServerUrl('ws://127.0.0.1:7338')}
      >
        <Text>Switch Server</Text>
      </Pressable>
      {strictMode ? <StrictMode>{providers}</StrictMode> : providers}
      <Text>{`Server: ${current.serverUrl}`}</Text>
      <Text>{`Open Connections: ${current.open}`}</Text>
      <Text>{`Closed Connections: ${current.closed}`}</Text>
      <Text>{`Screen subscriptions: ${current.screenSubscriptions}`}</Text>
      <Text>
        {`Connection states the screens saw: ${current.statesScreensSaw.join(', ')}`}
      </Text>
    </View>
  );
}

// Stands in for a screen: subscribes over the Connection from context and records its states; a closed one reads idle.
function ScreenMock(): null {
  const client = useTRPCClient();
  useEffect(() => {
    recordScreenSubscription();
    const subscription = client.system.clock.subscribe(undefined, {
      onConnectionStateChange: ({ state }) => {
        recordScreenState(state);
      },
    });
    return (): void => subscription.unsubscribe();
  }, [client]);
  return null;
}
