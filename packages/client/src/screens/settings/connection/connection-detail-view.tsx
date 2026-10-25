import { errorToast } from '@repo/kit/error-toast';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type * as React from 'react';
import { formatServerClock, formatServerStart } from '#features/connection';

export type ServerDetails =
  | { status: 'loading' }
  // The Connection is down: the banner over the page says so.
  | { status: 'down' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      version: string;
      startedAt: string;
      pid: number;
      // The Server's latest clock tick; absent until the first one arrives.
      clock?: string;
    };

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
  useErrorToast(errorToast('Could not load the Server', loadError(server)));

  return <ServerState server={server} />;
}

const loadError = (server: ServerDetails): string | undefined =>
  server.status === 'error' ? server.message : undefined;

function ServerState({
  server,
}: {
  server: ServerDetails;
}): React.JSX.Element | null {
  if (server.status === 'down') return null;

  // A failed load keeps the loading look: the toast says why, and the query retries when the Connection reopens.
  return (
    <Skeleton loading={server.status !== 'loaded'}>
      <ServerRows values={valuesOf(server)} />
    </Skeleton>
  );
}

interface ServerValues {
  version: string;
  started: string;
  pid: string;
  clock: string;
}

// Until the Server answers its rows have their titles and no values, which the Skeleton turns into shapes.
const awaiting: ServerValues = { version: '', started: '', pid: '', clock: '' };

const valuesOf = (server: ServerDetails): ServerValues =>
  server.status === 'loaded'
    ? {
        version: server.version,
        started: formatServerStart(server.startedAt, server.clock),
        pid: String(server.pid),
        clock: formatServerClock(server.clock),
      }
    : awaiting;

const ServerRows = ({
  values,
}: {
  values: ServerValues;
}): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Server">
      <FieldGroup.Value title="Version" value={values.version} />
      <FieldGroup.Value title="Started" value={values.started} />
      <FieldGroup.Value title="PID" value={values.pid} />
      <FieldGroup.Value title="Clock" value={values.clock} />
    </FieldGroup.Section>
  </FieldGroup>
);
