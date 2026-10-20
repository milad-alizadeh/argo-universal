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

export type QueryWatch = Extract<PluginDataRequest, { action: 'watch' }>;

export function watchKey(
  request: Pick<PluginDataRequest, 'viewId' | 'watchId'>,
): string {
  return JSON.stringify([request.viewId, request.watchId]);
}
