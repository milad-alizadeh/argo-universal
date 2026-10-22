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
  settings: savedSettings,
} satisfies PluginFixture;

export const pluginWithSecret = {
  status: 'loaded',
  enabled: true,
  fields: settingsSchema,
  settings: savedSettingsWithToken,
} satisfies PluginFixture;

export const turnedOffPlugin = {
  status: 'loaded',
  enabled: false,
  fields: settingsSchema,
  settings: savedSettings,
} satisfies PluginFixture;

export const pluginWithoutSettings = {
  status: 'loaded',
  enabled: true,
  fields: [],
  settings: { values: {}, secretsSet: [] },
} satisfies PluginFixture;
