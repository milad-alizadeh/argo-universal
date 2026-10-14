import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from '#primitives/lists/list-item';
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
    <View className="flex-1 bg-sidebar wide:bg-transparent">
      <SettingsPage
        title="Connection"
        caption="The Argo Server this App is talking to."
      >
        <FieldGroup>
          <FieldSection title="Server">
            <ServerRows server={server} />
          </FieldSection>
        </FieldGroup>
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
    return <ListItem title="Connecting to the Server…" loading />;
  }

  return <LoadedRows server={server} />;
}

function LoadedRows({ server }: { server: LoadedServer }): React.JSX.Element {
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
