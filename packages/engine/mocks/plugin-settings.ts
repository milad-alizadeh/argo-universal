import type { PluginSettingField } from '@repo/contracts/plugins';
import type { startEngineTestHost } from './engine';

export const defaultHost = 'github.com';

export const showClosed = 'show-closed';

// One field of each type `contributes.settings` allows.
export const probeSettings: PluginSettingField[] = [
  { key: 'host', type: 'text', label: 'Host', default: defaultHost },
  { key: 'token', type: 'secret', label: 'Token' },
  { key: showClosed, type: 'toggle', label: 'Show closed Issues' },
  {
    key: 'sort',
    type: 'picker',
    label: 'Sort by',
    options: [
      { value: 'updated', label: 'Recently updated' },
      { value: 'created', label: 'Newest' },
    ],
    default: 'updated',
  },
];

export const settingsProbe = {
  id: 'probe',
  fixture: 'healthy',
  settings: probeSettings,
};

type Caller = Awaited<ReturnType<typeof startEngineTestHost>>['caller'];

export const probeEntry = async (
  caller: Caller,
): Promise<
  Awaited<ReturnType<Caller['plugin']['list']>>['plugins'][number] | undefined
> =>
  (await caller.plugin.list()).plugins.find(
    ({ manifest }) => manifest.id === 'probe',
  );
