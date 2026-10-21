import { errorToast } from '@repo/kit/error-toast';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { Page } from '@repo/kit/primitives/scaffolds/page';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
import { formatServerClock, formatServerStart } from '#features/connection';

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
    <Page title="Connection" caption="The Argo Server this App is talking to.">
      <ServerList server={server} />
    </Page>
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
      <DetailRow title="Version" value={server.version} />
      <DetailRow
        title="Started"
        value={formatServerStart(server.startedAt, server.clock)}
      />
      <DetailRow title="PID" value={String(server.pid)} />
      <DetailRow title="Clock" value={formatServerClock(server.clock)} />
    </>
  );
}

// Paper's Connection page: a Server detail reads as content, in the title's colour.
function DetailRow(props: { title: string; value: string }): React.JSX.Element {
  return <ListItem {...props} valueTone="neutral" />;
}

function ConnectingRow(): React.JSX.Element {
  return (
    <ListItem
      title="Connecting to the Server…"
      leading={<Spinner accessibilityLabel="Loading" />}
    />
  );
}
