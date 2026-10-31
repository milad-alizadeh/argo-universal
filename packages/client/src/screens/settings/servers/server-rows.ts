import type { RowBadge } from '@repo/kit/primitives/lists/list-item';
import type { AppServer, AppServerState } from '#features/servers';

// One Server in the list: what it is called, whether this Device runs it, and its own state.
export interface ServerRow {
  id: string;
  name: string;
  serverDevice: boolean;
  state: AppServerState;
}

export type ServerStates = ReadonlyMap<string, AppServerState>;

/*
 * One Server's row. A Server with no state of its own is one no Connection was opened to, because this Device has no
 * address for it; the row says unreachable, which is what the owner needs to read.
 */
export const serverRow = (
  server: AppServer,
  states: ServerStates,
): ServerRow => ({
  id: server.id,
  name: server.name,
  serverDevice: server.serverDevice,
  state: states.get(server.id) ?? 'unreachable',
});

const states = {
  connected: { tone: 'success', label: 'Connected' },
  connecting: { tone: 'warning', label: 'Connecting…' },
  unreachable: { tone: 'danger', label: 'Unreachable' },
} as const satisfies Record<
  AppServerState,
  Omit<Extract<RowBadge, { kind: 'status' }>, 'kind'>
>;

// Each Server says its own state, so one unreachable computer says nothing about the next.
export const serverBadge = (state: AppServerState): RowBadge => ({
  kind: 'status',
  ...states[state],
});

// The state in words, beside the dot that tones it: colour alone would say it to no one who cannot see it.
export const serverStateLabel = (state: AppServerState): string =>
  states[state].label;

// The whole row, spoken: the Server and its state.
export const serverRowName = (row: ServerRow): string =>
  `${row.name}, ${states[row.state].label}`;

// What the list says it is showing. One Server is the ordinary case, so the footer reads the same for one as for six.
export function shownServerFooter(
  servers: readonly ServerRow[],
  lookingAt: string,
): string {
  const shown = servers.find((server) => server.id === lookingAt);

  if (!shown) return 'Choose the Server to show.';

  return shown.serverDevice
    ? 'Argo is showing the Server on this computer.'
    : `Argo is showing ${shown.name}. Its Sessions, Projects and Feed are the ones you see.`;
}
