import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import type { createPluginRuntime } from './runtime/create-runtime';
import type { PluginNetwork } from './services/plugin-fetch';
import type { SessionActs } from './session-acts';

type PortSources = {
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
  // What `argo.sessions.archive`, `prompt` and `withdraw` reach; the Engine attaches the App's acts to it.
  sessionActs?: SessionActs;
};

type RuntimeOptions = Parameters<typeof createPluginRuntime>[1];

type ActPorts = Pick<
  RuntimeOptions,
  'archiveSession' | 'promptSession' | 'withdrawPrompt'
>;

// The Session acts a Plugin reaches; with none attached, a Plugin cannot act on Sessions.
const actPorts = (acts?: SessionActs): ActPorts =>
  acts
    ? {
        archiveSession: acts.archive,
        promptSession: acts.prompt,
        withdrawPrompt: acts.withdraw,
      }
    : {};

export function runtimePorts(
  options: PortSources,
): Pick<RuntimeOptions, 'network' | 'oauth' | 'clock'> & ActPorts {
  return {
    ...actPorts(options.sessionActs),
    network: options.pluginNetwork,
    oauth: options.pluginOAuth,
    clock: options.pluginClock,
  };
}
