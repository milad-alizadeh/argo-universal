import type { ServerDetailLoad } from './server-detail-view';

const paired = {
  status: 'loaded',
  name: 'Studio PC',
  serverDevice: false,
  showing: false,
} as const;

export const connectedServer = {
  ...paired,
  paired: '3 October',
  lastConnected: 'Now',
  state: 'connected',
} satisfies ServerDetailLoad;

export const shownServer = {
  ...connectedServer,
  showing: true,
} satisfies ServerDetailLoad;

// The computer did not answer: nothing is wrong with the pairing.
export const unreachableServer = {
  ...paired,
  paired: '3 October',
  lastConnected: 'Today, 09:12',
  state: 'unreachable',
} satisfies ServerDetailLoad;

// The Server answered and said it no longer knows this Device.
export const notAllowedServer = {
  ...paired,
  name: 'Office laptop',
  paired: '28 September',
  lastConnected: 'Yesterday, 18:40',
  state: 'not-allowed',
} satisfies ServerDetailLoad;

// This Device's own Server: it is never unpaired from.
export const ownServer = {
  status: 'loaded',
  name: 'This computer',
  serverDevice: true,
  showing: true,
  state: 'connected',
} satisfies ServerDetailLoad;
