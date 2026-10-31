import { useQueryClient } from '@tanstack/react-query';
import type * as React from 'react';
import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppProviders } from './app-providers';
import { useTRPCClient } from './features/connection/api/trpc/context';
import { useAppServers } from './features/servers';
import {
  currentReport,
  recordScreenCache,
  recordScreenState,
  recordScreenSubscription,
  subscribe,
} from './websocket-report.mocks';

export interface ConnectionMockProps {
  strictMode?: boolean;
}

// Shows AppProviders' Connections over WebSocketMock; it starts unmounted, so StrictMode's double effects reach AppProviders.
export function ConnectionMock({
  strictMode,
}: ConnectionMockProps): React.JSX.Element {
  const controls = useConnectionControls();

  return (
    <View>
      <ControlButtonsMock {...controls} />
      <ProvidersMock {...controls} strictMode={strictMode} />
      <ConnectionReportMock />
    </View>
  );
}

interface ConnectionControls {
  mounted: boolean;
  serverUrl: string;
  toggleMount: () => void;
  switchServer: () => void;
}

function useConnectionControls(): ConnectionControls {
  const [mounted, setMounted] = useState(false);
  const [serverUrl, setServerUrl] = useState('ws://127.0.0.1:7337');

  return {
    mounted,
    serverUrl,
    toggleMount: () => setMounted(!mounted),
    switchServer: () => setServerUrl('ws://127.0.0.1:7338'),
  };
}

function ControlButtonsMock(controls: ConnectionControls): React.JSX.Element {
  return (
    <>
      <ButtonMock
        label={controls.mounted ? 'Unmount' : 'Mount'}
        onPress={controls.toggleMount}
      />
      <ButtonMock label="Switch Server" onPress={controls.switchServer} />
    </>
  );
}

function ButtonMock(props: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable role="button" onPress={props.onPress}>
      <Text>{props.label}</Text>
    </Pressable>
  );
}

type ProvidersMockProps = ConnectionMockProps &
  Pick<ConnectionControls, 'mounted' | 'serverUrl'>;

function ProvidersMock(props: ProvidersMockProps): React.JSX.Element | null {
  const providers = props.mounted ? (
    <AppProviders serverUrl={props.serverUrl}>
      <LookAtKeptServerMock />
      <ScreenMock />
    </AppProviders>
  ) : null;

  return props.strictMode === true ? (
    <StrictMode>{providers}</StrictMode>
  ) : (
    providers
  );
}

// Looks at the Server this Device paired with, as the Servers page does.
function LookAtKeptServerMock(): React.JSX.Element {
  const { look } = useAppServers();

  return (
    <ButtonMock label="Look at Studio" onPress={() => look('studio-key')} />
  );
}

function ConnectionReportMock(): React.JSX.Element {
  const current = useSyncExternalStore(subscribe, currentReport);

  return (
    <>
      <Text>{`Server: ${current.serverUrl}`}</Text>
      <Text>{`Open Connections: ${current.open}`}</Text>
      <Text>{`Closed Connections: ${current.closed}`}</Text>
      <Text>{`Screen subscriptions: ${current.screenSubscriptions}`}</Text>
      <Text>
        {`Connection states the screens saw: ${current.statesScreensSaw.join(', ')}`}
      </Text>
      <Text>{`Caches the screens saw: ${current.cachesScreensSaw}`}</Text>
    </>
  );
}

// Stands in for a screen: subscribes over the Connection from context and records its states; a closed one reads idle.
function ScreenMock(): null {
  const client = useTRPCClient();
  const cache = useQueryClient();

  useEffect(() => recordScreenCache(cache), [cache]);
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
