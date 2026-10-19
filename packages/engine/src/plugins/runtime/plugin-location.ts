import type { HookEventName, PluginCapability } from '@repo/contracts/plugins';
import type { ActivatedPlugin } from '../access/plugin-access';
import type { HookAllowance } from '../hooks/hook-registry';
import type { PluginEntry } from '../protocol/runtime';

export type PluginLocation = {
  entry: Omit<PluginEntry, 'generation'>;
  name?: string;
  // The manifest's declared Capabilities; without them the Plugin is granted nothing.
  capabilities?: readonly PluginCapability[];
  // The core events the manifest says the Plugin hooks.
  hooks?: readonly HookEventName[];
};

export const activatedPlugin = ({
  entry,
  capabilities = [],
}: PluginLocation): ActivatedPlugin => ({
  grants: capabilities,
  codeFolder: entry.directory,
});

export const hookAllowance = ({
  hooks = [],
  capabilities = [],
}: PluginLocation): HookAllowance => ({ events: hooks, grants: capabilities });
