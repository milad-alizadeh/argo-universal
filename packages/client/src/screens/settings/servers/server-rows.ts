import type { Tone } from '@repo/kit/primitives/content/text';
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

// Each Server says its own state in words, so one unreachable computer says nothing about the next.
export const serverStateLabel = (state: AppServerState): string =>
  stateLabels[state];

// Grey is a computer that did not answer, and red one that answered and no longer knows this Device.
const stateTones = {
  connected: 'success',
  connecting: 'muted',
  unreachable: 'muted',
  'not-allowed': 'danger',
} as const satisfies Record<AppServerState, Tone>;

export const serverStateTone = (state: AppServerState): Tone =>
  stateTones[state];

// The footer says what the tone of a state means, which no other word on the page does.
export const serverListFooter =
  'Grey means the computer did not answer. Red means it no longer knows this phone.';
