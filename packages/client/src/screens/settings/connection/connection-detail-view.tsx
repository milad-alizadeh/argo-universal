import { errorToast } from '@repo/kit/error-toast';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type * as React from 'react';
import { formatServerClock, formatServerStart } from '#features/connection';

export type ServerDetails =
  | { status: 'loading' }
  // The Connection is down: the banner says so where the Frame draws one; the page keeps its loading look either way.
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

function ServerState({ server }: { server: ServerDetails }): React.JSX.Element {
  // A down Connection or a failed load keeps the loading look, never a blank page: the banner or toast says why, and the query retries when the Connection reopens.
  return (
    <Skeleton loading={server.status !== 'loaded'} fill>
      <ServerRows server={server} />
    </Skeleton>
  );
}

const ServerRows = ({
  server,
}: {
  server: ServerDetails;
}): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Server">
      {detailRows(rowValues(server))}
    </FieldGroup.Section>
  </FieldGroup>
);

interface RowValues {
  version?: string;
  started?: string;
  pid?: string;
  clock?: string;
}

// The rows are the page's own; one whose value has not arrived has none, which the Skeleton leaves as its title alone.
function rowValues(server: ServerDetails): RowValues {
  if (server.status !== 'loaded') return {};

  return {
    version: server.version,
    started: formatServerStart(server.startedAt, server.clock),
    pid: String(server.pid),
    clock: formatServerClock(server.clock),
  };
}

/*
 * Called, not rendered: the Section frames each child as one row, so rows hidden behind a component would share one
 * frame and pack at the text's own height, with no separator between them.
 */
const detailRows = (values: RowValues): React.JSX.Element[] => [
  <DetailRow key="version" title="Version" value={values.version} />,
  <DetailRow key="started" title="Started" value={values.started} />,
  <DetailRow key="pid" title="PID" value={values.pid} />,
  <DetailRow key="clock" title="Clock" value={values.clock} />,
];

// A Server detail is a read-only value row.
function DetailRow(props: {
  title: string;
  value: string | undefined;
}): React.JSX.Element {
  return <FieldGroup.Value title={props.title} value={props.value ?? ''} />;
}
