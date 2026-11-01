import type {
  AppServer,
  AppServerState,
  ServerStates,
} from '#features/servers';

// One Server in the list: what it is called, whether this Device runs it, and its own state.
export interface ServerRow {
  id: string;
  name: string;
  serverDevice: boolean;
  state: AppServerState;
}

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

const stateLabels = {
  connected: 'Connected',
  connecting: 'Connecting…',
  unreachable: 'Not found on this network',
  'not-allowed': 'Needs pairing again',
} as const satisfies Record<AppServerState, string>;

/*
 * Each Server says its own state in words, so one unreachable computer says nothing about the next. The word is the
 * whole of it: a toned dot beside it would say the same thing again, and this list carries no icon for one to sit on.
 */
export const serverStateLabel = (state: AppServerState): string =>
  stateLabels[state];

// Opening a row is where a Server is shown, fixed or unpaired from; the row itself says which one is shown.
export const serverListFooter =
  'Argo shows one Server at a time: its Sessions, Projects and Feed. Open a Server to show it, or to unpair from it.';
