import {
  PluginSettingsSchema,
  type PluginSettings,
} from '@repo/contracts/plugins';
import { pluginSymbol } from '../../../lib/product/plugin-symbol';
import type { PluginRow } from './plugin-list-view';

export const githubPlugin: PluginRow = {
  pluginId: 'github',
  name: 'GitHub',
  icon: pluginSymbol({}),
};

export const examplePlugin: PluginRow = {
  pluginId: 'example',
  name: 'Example',
  icon: pluginSymbol({}),
};

export const pluginRows: PluginRow[] = [githubPlugin, examplePlugin];

// One field of each type the schema allows, checked by the same schema the Server checks manifests with.
export const settingsSchema = PluginSettingsSchema.parse([
  {
    key: 'host',
    type: 'text',
    label: 'Host',
    description: 'The GitHub host your repositories are on.',
    default: 'github.com',
  },
  {
    key: 'token',
    type: 'secret',
    label: 'Token',
    description: 'Kept in the Keychain on the Server.',
  },
  {
    key: 'show-closed',
    type: 'toggle',
    label: 'Show closed pull requests',
    description: 'Closed and merged pull requests stay in the list.',
  },
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
]);

export const savedSettings: PluginSettings = {
  values: { host: 'github.com', 'show-closed': false, sort: 'updated' },
  secretsSet: [],
};

export const savedSettingsWithToken: PluginSettings = {
  ...savedSettings,
  secretsSet: ['token'],
};
