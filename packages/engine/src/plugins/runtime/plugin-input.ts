import type { ActivatedPlugin } from '../access/plugin-access';
import type { HostConnection } from '../host/connection';
import type { PluginEntry, PluginStatus } from '../protocol/runtime';

export type RuntimePluginInput = {
  deferReload: () => boolean;
  clockStart: () => number | undefined;
  entry: Omit<PluginEntry, 'generation'>;
  host: HostConnection;
  // Grants the Plugin its Capabilities as each worker loads; `release` takes them away again.
  grant: (plugin: ActivatedPlugin) => void;
  release: () => void;
  log: (line: string) => void;
  changed: (status: PluginStatus) => void;
};
