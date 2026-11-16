import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import type { createPluginRuntime } from './runtime/create-runtime';
import type { PluginNetwork } from './services/plugin-fetch';
import type { SessionActs } from './session-acts';

type PortSources = {
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
  // What `argo.sessions.archive` and `prompt` reach; the Engine attaches the App's acts to it.
  sessionActs?: SessionActs;
};

export function runtimePorts(
  options: PortSources,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'network' | 'oauth' | 'clock' | 'archiveSession' | 'promptSession'
> {
  return {
    archiveSession: options.sessionActs?.archive,
    promptSession: options.sessionActs?.prompt,
    network: options.pluginNetwork,
    oauth: options.pluginOAuth,
    clock: options.pluginClock,
  };
}
