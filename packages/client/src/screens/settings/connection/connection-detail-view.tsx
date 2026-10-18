import type * as React from 'react';
import { View } from 'react-native';
import { formatServerClock, formatServerStart } from '#features/connection';
import { errorToast } from '#lib/generic/error-toast';
import { SettingsPage } from '#lib/product/settings-page';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { useErrorToast } from '#primitives/overlays/toast';
import { Spinner } from '#primitives/status/spinner';

export type ServerDetails =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      version: string;
      startedAt: string;
      pid: number;
      // The Server's latest clock tick; absent until the first one arrives.
      clock?: string;
    };

type LoadedServer = Extract<ServerDetails, { status: 'loaded' }>;

interface ConnectionDetailViewProps {
  server: ServerDetails;
}

// The Server this App talks to: its details and live clock, or why they are missing.
export function ConnectionDetailView({
  server,
}: ConnectionDetailViewProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage
        title="Connection"
        caption="The Argo Server this App is talking to."
      >
        <ServerList server={server} />
      </SettingsPage>
    </View>
  );
}

function ServerList({ server }: { server: ServerDetails }): React.JSX.Element {
  useErrorToast(
    errorToast(
      "Could not load the Server's details",
      server.status === 'error' ? server.message : undefined,
    ),
  );

  return (
    <List appearance="grouped">
      <ListSection title="Server">{serverRows(server)}</ListSection>
    </List>
  );
}

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function serverRows(server: ServerDetails): React.JSX.Element {
  if (server.status !== 'loaded') {
    return <ConnectingRow />;
  }

  return loadedRows(server);
}

function loadedRows(server: LoadedServer): React.JSX.Element {
  return (
    <>
      <ListItem title="Version" value={server.version} />
      <ListItem
        title="Started"
        value={formatServerStart(server.startedAt, server.clock)}
      />
      <ListItem title="PID" value={String(server.pid)} />
      <ListItem title="Clock" value={formatServerClock(server.clock)} />
    </>
  );
}

function ConnectingRow(): React.JSX.Element {
  return (
    <ListItem
      title="Connecting to the Server…"
      leading={<Spinner accessibilityLabel="Loading" />}
    />
  );
}
