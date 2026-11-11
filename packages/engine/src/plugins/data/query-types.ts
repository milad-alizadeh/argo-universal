import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginClock } from '../clock';
import type { PluginServices } from '../services/plugin-services';

export type QueryOwner = {
  pluginId: string;
  generation: number;
  projectId?: string;
  query: PluginQuery;
};

// What Queries need of the Server: the one call that performs a described Query, its clock and its log.
export type QueryServices = {
  services: Pick<PluginServices, 'handle'>;
  clock: PluginClock;
  log: (line: string) => void;
  during: <T>(call: () => Promise<T>) => Promise<T>;
};

/*
 * A Loader's read for one draw: the address holding it, whether it reads fresh whatever is kept, and the
 * interval its page is drawn again on, past which a kept answer is read again.
 */
export type QueryRead = {
  holder?: PageAddress;
  fresh: boolean;
  // The draw reading, which a paged list's page is read for; code outside a draw has none.
  draw?: number;
  every?: number;
};
