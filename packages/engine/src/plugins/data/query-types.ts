import type {
  PluginDataRequest,
  PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
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
  send: (pluginId: string, event: PluginEvent) => void;
  log: (line: string) => void;
  during: <T>(call: () => Promise<T>) => Promise<T>;
};

// What Timing needs of the watchers: whether any view holds the Query, and how often they want it.
export type QueryPacing = { active: boolean; period: number };

export type QueryWatch = Extract<PluginDataRequest, { action: 'watch' }>;

/*
 * One Loader read of an entry: the Page address whose draw read it, which a changed answer marks, or none
 * for a background pass; whether it reads again whatever is kept; and the draw a paged-list page is read for.
 */
export type QueryRead = { holder?: PageAddress; fresh: boolean; draw: number };

export function watchKey(request: { viewId: string; watchId: string }): string {
  return JSON.stringify([request.viewId, request.watchId]);
}
