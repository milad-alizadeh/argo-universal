import type { HostConnection } from './host-connection';
import type { ActivatedPlugin } from './plugin-access';
import type { PluginEntry, PluginStatus } from './runtime-protocol';

export type RuntimePluginInput = {
  deferReload: () => boolean;
  entry: Omit<PluginEntry, 'generation'>;
  host: HostConnection;
  // Grants the Plugin its Capabilities as each worker loads; `release` takes them away again.
  grant: (plugin: ActivatedPlugin) => void;
  release: () => void;
  log: (line: string) => void;
  changed: (status: PluginStatus) => void;
};
