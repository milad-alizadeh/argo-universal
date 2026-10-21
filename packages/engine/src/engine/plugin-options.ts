import type {
  Keychain,
  PluginNetwork,
  OAuthOptions,
  PluginClock,
} from '../plugins';

export type PluginServerOptions = {
  firstPartyPluginsDirectory?: string;
  keychain?: Keychain;
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
};
