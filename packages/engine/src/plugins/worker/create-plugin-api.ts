import { createKit, type Kit } from '../kit/plugin-kit';
import type { PluginRequest } from '../protocol/runtime';
import type { ArgoBridge } from './argo';
import { hookInbox } from './hook-inbox';
import type { Argo } from './plugin-api';
import { argoObject } from './plugin-api-calls';

// Sends one request over the bridge and resolves to the Server's JSON answer.
export type ArgoCall = <Answer>(request: PluginRequest) => Promise<Answer>;

type PluginInbox = (json: string) => void;

// What the worker takes from a started realm: the inboxes for pages and Hooks, and the modules `@argo/plugin-kit` serves.
export type PluginApi = {
  argo: Argo;
  inboxes: { pages: PluginInbox; hooks: PluginInbox };
  modules: Pick<Kit, 'exports' | 'jsxRuntime'>;
};

// No object, promise or error from the worker's realm reaches Plugin code: only the bridge's JSON text crosses.
const callOver =
  (bridge: ArgoBridge): ArgoCall =>
  async (request) => {
    try {
      return JSON.parse(await bridge(JSON.stringify(request)));
    } catch (error) {
      throw new Error(String(error ? Object(error).message : error));
    }
  };

// The kit sends its views and dispatch results over the same bridge.
const kitOver = (call: ArgoCall): Kit =>
  createKit(
    async (viewId, message) => {
      await call({ api: 'view', viewId, message });
    },
    async (requestId, result) => {
      await call({ api: 'dispatchResult', requestId, result });
    },
  );

// Runs inside each Plugin's realm, bundled with the kit (`bundleRealm`).
export function createPluginApi(bridge: ArgoBridge): PluginApi {
  const call = callOver(bridge);
  const kit = kitOver(call);
  const hooks = hookInbox(call, kit);

  return {
    argo: argoObject(call, kit, hooks.on),
    inboxes: { pages: kit.inbox, hooks: hooks.inbox },
    modules: { exports: kit.exports, jsxRuntime: kit.jsxRuntime },
  };
}
