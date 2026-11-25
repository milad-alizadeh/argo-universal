// Leaf imports for the values: a node test cannot import a feature's index (React Native, "Flow is not supported").
import {
  forgetServerMedia,
  rememberServerMedia,
} from './features/connection/api/channel/media-store';
import type { ServersStoreHooks } from './features/servers';
import {
  forgetServerCache,
  rememberServerCache,
} from './features/servers/server-cache-store';

// What the App keeps on the Device for a Server, wiped when the Server is unpaired or removed and lifted when it is paired again.
export const serversStoreHooks: Required<ServersStoreHooks> = {
  onForgotten: [forgetServerMedia, forgetServerCache],
  onAdded: [rememberServerMedia, rememberServerCache],
};
