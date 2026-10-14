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
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage
        title="Connection"
        caption="The Argo Server this App is talking to."
      >
        <GroupedList>
          <GroupedListSection title="Server">
            <ServerRows server={server} />
          </GroupedListSection>
        </GroupedList>
      </SettingsPage>
    </View>
  );
}

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function ServerRows({ server }: { server: ServerDetails }): React.JSX.Element {
  useErrorToast(
    server.status === 'error'
      ? {
          title: "Could not load the Server's details",
          message: server.message,
        }
      : undefined,
  );

  if (server.status !== 'loaded') {
    return <GroupedListItem label="Connecting to the Server…" loading />;
  }

  return <LoadedRows server={server} />;
}

function LoadedRows({ server }: { server: LoadedServer }): React.JSX.Element {
  return (
    <>
      <GroupedListItem label="Version" value={server.version} />
      <GroupedListItem
        label="Started"
        value={formatServerStart(server.startedAt, server.clock)}
      />
      <GroupedListItem label="PID" value={String(server.pid)} />
      <GroupedListItem label="Clock" value={formatServerClock(server.clock)} />
    </>
  );
}
