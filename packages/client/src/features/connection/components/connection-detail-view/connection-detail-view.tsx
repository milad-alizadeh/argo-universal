import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useErrorToast } from '#primitives/overlays/toast';
import { formatServerClock, formatServerStart } from '../server-time';

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

// The Server this App talks to: its details and live clock, or why they are missing.
export function ConnectionDetailView({
  server,
}: {
  server: ServerDetails;
}): React.JSX.Element {
  useServerErrorToast(server);

  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage
        title="Connection"
        caption="The Argo Server this App is talking to."
      >
        <GroupedList>
          <GroupedListSection title="Server">
            {serverRows(server)}
          </GroupedListSection>
        </GroupedList>
      </SettingsPage>
    </View>
  );
}

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function useServerErrorToast(server: ServerDetails): void {
  useErrorToast(
    server.status === 'error'
      ? {
          title: "Could not load the Server's details",
          message: server.message,
        }
      : undefined,
  );
}

// A section takes each child as one row, so the rows are returned as elements, not one component.
function serverRows(server: ServerDetails): React.JSX.Element[] {
  if (server.status !== 'loaded')
    return [
      <GroupedListItem
        key="connecting"
        label="Connecting to the Server…"
        loading
      />,
    ];

  return loadedRows(server);
}

function loadedRows(server: LoadedServer): React.JSX.Element[] {
  return [
    <GroupedListItem key="version" label="Version" value={server.version} />,
    <GroupedListItem
      key="started"
      label="Started"
      value={formatServerStart(server.startedAt, server.clock)}
    />,
    <GroupedListItem key="pid" label="PID" value={String(server.pid)} />,
    <GroupedListItem
      key="clock"
      label="Clock"
      value={formatServerClock(server.clock)}
    />,
  ];
}
