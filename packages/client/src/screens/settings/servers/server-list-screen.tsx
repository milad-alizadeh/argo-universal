import type * as React from 'react';
import { useAppServers, useAppServerStates } from '#features/servers';
import { ServerListView } from './server-list-view';
import { serverRow } from './server-rows';

// The App's list of Servers, each with its own state, and which one it is showing.
export function ServerListScreen(): React.JSX.Element {
  const { servers, lookingAt, look } = useAppServers();
  const states = useAppServerStates();

  return (
    <ServerListView
      servers={servers.map((server) => serverRow(server, states))}
      lookingAt={lookingAt}
      onLookAt={look}
    />
  );
}
