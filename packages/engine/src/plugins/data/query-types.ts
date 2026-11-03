import type {
  PluginDataRequest,
  PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { PluginServices } from '../services/plugin-services';

export type QueryOwner = {
  pluginId: string;
  generation: number;
  projectId?: string;
  query: PluginQuery;
};

export type QueryServices = {
  services: PluginServices;
  clock: PluginClock;
  send: (pluginId: string, event: PluginEvent) => void;
  log: (line: string) => void;
  during: <T>(call: () => Promise<T>) => Promise<T>;
};

// What Timing needs of the watchers: whether any view holds the Query, and how often each kind wants it.
export type QueryPacing = {
  active: boolean;
  period: number;
  backgroundPeriod: number;
};

export type QueryWatch = Extract<PluginDataRequest, { action: 'watch' }>;

export type QueryRead = Extract<PluginDataRequest, { action: 'read' }>;

export function watchKey(
  request: Pick<QueryWatch, 'viewId' | 'watchId'>,
): string {
  return JSON.stringify([request.viewId, request.watchId]);
}
