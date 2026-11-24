import {
  forgetServerMedia,
  rememberServerMedia,
} from './features/connection/api/channel/media-store';
import {
  forgetServerCache,
  rememberServerCache,
} from './features/servers/server-cache-store';
import type { ServersStoreHooks } from './features/servers/servers-store';

// What the App keeps on the Device for a Server, wiped when the Server is unpaired or removed and lifted when it is paired again.
export const serversStoreHooks: Required<ServersStoreHooks> = {
  onForgotten: [forgetServerMedia, forgetServerCache],
  onAdded: [rememberServerMedia, rememberServerCache],
};
