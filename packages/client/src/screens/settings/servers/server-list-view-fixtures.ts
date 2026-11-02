import { ownServerId, ownServerName } from '#lib/product/server-scope';
import type { ServerRow } from './server-rows';

const own = (state: ServerRow['state']): ServerRow => ({
  id: ownServerId,
  name: ownServerName,
  serverDevice: true,
  state,
});

// A Device that has paired with nothing: one row, the ordinary case.
export const oneServer: readonly ServerRow[] = [own('connected')];

export const severalServers: readonly ServerRow[] = [
  own('connected'),
  { id: 'studio', name: 'Studio', serverDevice: false, state: 'connected' },
  {
    id: 'bench',
    name: 'Workshop bench',
    serverDevice: false,
    state: 'unreachable',
  },
];

// A Server that answered and no longer knows this Device: it was unpaired there.
export const unpairedServers: readonly ServerRow[] = [
  own('connected'),
  { id: 'studio', name: 'Studio', serverDevice: false, state: 'not-allowed' },
];
