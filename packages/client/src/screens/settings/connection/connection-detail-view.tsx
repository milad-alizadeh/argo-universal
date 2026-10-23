import { errorToast } from '@repo/kit/error-toast';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
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
    <Screen
      title="Connection"
      caption="The Argo Server this App is talking to."
    >
      <ServerForm server={server} />
    </Screen>
  );
}

function ServerForm({ server }: { server: ServerDetails }): React.JSX.Element {
  useErrorToast(
    errorToast(
      "Could not load the Server's details",
      server.status === 'error' ? server.message : undefined,
    ),
  );

  return (
    <FieldGroup>
      <FieldGroup.Section title="Server">
        {serverRows(server)}
      </FieldGroup.Section>
    </FieldGroup>
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

// A Server detail is a read-only value row.
function DetailRow(props: { title: string; value: string }): React.JSX.Element {
  return <FieldGroup.Value {...props} />;
}

// Until the Server answers, the one row says so, as a value row with nothing beside it yet.
function ConnectingRow(): React.JSX.Element {
  return <FieldGroup.Value title="Connecting to the Server…" value="" />;
}
