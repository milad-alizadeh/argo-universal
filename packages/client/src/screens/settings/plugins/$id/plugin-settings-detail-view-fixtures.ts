import {
  savedSettings,
  savedSettingsWithToken,
  settingsSchema,
} from '../plugin-settings.fixtures';
import type { PluginSettingsDetailViewProps } from './plugin-settings-detail-view';

type PluginFixture = PluginSettingsDetailViewProps['plugin'];

export const loadedPlugin = {
  status: 'loaded',
  enabled: true,
  fields: settingsSchema,
  accounts: [],
  settings: savedSettings,
} satisfies PluginFixture;

export const pluginWithSecret = {
  status: 'loaded',
  enabled: true,
  fields: settingsSchema,
  accounts: [],
  settings: savedSettingsWithToken,
} satisfies PluginFixture;

export const turnedOffPlugin = {
  status: 'loaded',
  enabled: false,
  fields: settingsSchema,
  accounts: [],
  settings: savedSettings,
} satisfies PluginFixture;

export const pluginWithoutSettings = {
  status: 'loaded',
  enabled: true,
  fields: [],
  accounts: [],
  settings: { values: {}, secretsSet: [] },
} satisfies PluginFixture;

export const signedOutPlugin = {
  ...loadedPlugin,
  accounts: [{ host: 'api.github.com', page: '/sign-in' }],
} satisfies PluginFixture;

export const signedInPlugin = {
  ...loadedPlugin,
  accounts: [
    {
      host: 'api.github.com',
      page: '/sign-in',
      account: { id: 'acc-github-1', label: 'milad-alizadeh' },
    },
  ],
} satisfies PluginFixture;

export const stoppedPlugin = {
  ...signedOutPlugin,
  enabled: false,
} satisfies PluginFixture;
