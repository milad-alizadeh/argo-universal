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
  services: Pick<PluginServices, 'handle' | 'projectIds' | 'limitedUntil'>;
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
  // Read by code outside a draw, such as a Slot's provider, which a list's clock may age.
  outside?: boolean;
  // Asked for by someone, as an Operation run's read is, so a failed Query's rest does not hold it back (#2197).
  asked?: boolean;
};

// The draw a Loader's read is for: its id, and the Page address holding the read, or none for a background pass.
export type DrawnFor = { draw: number; holder?: PageAddress };

/*
 * Where a Loader's read came from: the Project its Query is for, and the draw or the Operation run, which someone
 * asked for. The runtime works it out from what the call runs for, so the Query modules need no draws.
 */
export type QueryOrigin = {
  projectId?: string;
  drawn?: DrawnFor;
  forRun?: true;
};
