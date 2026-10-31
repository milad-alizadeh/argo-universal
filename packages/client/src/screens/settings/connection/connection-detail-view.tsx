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

// Whether the Server outlives the desktop app that started it. Absent on a paired Device, which may not change it (Server Device only, ADR-0022).
export interface KeepRunningSetting {
  enabled: boolean;
  // A change that failed shows its toast; the switch stays where the Server has it.
  error?: string;
  onChange: (enabled: boolean) => void;
}

interface ConnectionDetailViewProps {
  server: ServerDetails;
  keepRunning?: KeepRunningSetting;
}

// The Server this App talks to: its details and live clock, or why they are missing.
export function ConnectionDetailView({
  server,
  keepRunning,
}: ConnectionDetailViewProps): React.JSX.Element {
  return (
    <Screen
      title="Connection"
      caption="The Argo Server this App is talking to."
    >
      <ServerForm server={server} keepRunning={keepRunning} />
    </Screen>
  );
}

function ServerForm(props: ConnectionDetailViewProps): React.JSX.Element {
  useErrorToast(
    errorToast('Could not load the Server', loadError(props.server)),
  );
  useErrorToast(
    errorToast('Could not change the Server', props.keepRunning?.error),
  );

  return <ServerState {...props} />;
}

const loadError = (server: ServerDetails): string | undefined =>
  server.status === 'error' ? server.message : undefined;

function ServerState({
  server,
  keepRunning,
}: ConnectionDetailViewProps): React.JSX.Element {
  // A down Connection or a failed load keeps the loading look, never a blank page: the banner or toast says why, and the query retries when the Connection reopens.
  return (
    <Skeleton loading={server.status !== 'loaded'} fill>
      <ServerRows server={server} keepRunning={keepRunning} />
    </Skeleton>
  );
}

const ServerRows = ({
  server,
  keepRunning,
}: ConnectionDetailViewProps): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Server">
      {detailRows(rowValues(server))}
    </FieldGroup.Section>
    {keepRunning ? keepRunningSection(keepRunning) : null}
  </FieldGroup>
);

const keepRunningSection = (setting: KeepRunningSetting): React.JSX.Element => (
  <FieldGroup.Section footer="When on, quitting the desktop app leaves the Server running, so a paired Device keeps working. When off, quitting stops the Server the app started.">
    <FieldGroup.Toggle
      title="Keep the Server running"
      value={setting.enabled}
      onValueChange={setting.onChange}
    />
  </FieldGroup.Section>
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
