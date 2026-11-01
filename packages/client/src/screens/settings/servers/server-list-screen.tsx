import { useRouter } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useAppServers, useAppServerStates } from '#features/servers';
import { ServerListView } from './server-list-view';
import { serverRow } from './server-rows';

// A web page has no camera and no secure storage, so it cannot pair and the list has no way to add a Server (ADR-0045).
function useAddServer(): (() => void) | undefined {
  const router = useRouter();

  return Platform.OS === 'web'
    ? undefined
    : () => router.push('/settings/servers/add');
}

// The App's list of Servers, each with its own state, and which one it is showing.
export function ServerListScreen(): React.JSX.Element {
  const { servers, lookingAt, look } = useAppServers();
  const states = useAppServerStates();

  return (
    <ServerListView
      servers={servers.map((server) => serverRow(server, states))}
      lookingAt={lookingAt}
      onLookAt={look}
      onAddServer={useAddServer()}
    />
  );
}
