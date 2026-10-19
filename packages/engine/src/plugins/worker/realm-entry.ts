import type { ArgoBridge } from './argo';
import { createPluginApi, type PluginApi } from './create-plugin-api';

export type StartedRealm = Omit<PluginApi, 'argo'>;

export type RealmStart = (bridge: ArgoBridge) => StartedRealm;

/*
 * Runs in a Plugin's realm with the kit (`bundleRealm`). The worker takes `start`, removes it, and
 * starts the realm once with the bridge: Plugin code then finds `argo` on its global object.
 */
const start: RealmStart = (bridge) => {
  const { argo, ...started } = createPluginApi(bridge);

  Object.assign(globalThis, { argo });

  return started;
};

Object.assign(globalThis, { __argoRealm: start });
