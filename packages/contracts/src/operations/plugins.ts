import { z } from 'zod';
import {
  PluginActivation,
  PluginEnablement,
  PluginList,
  PluginSettingChange,
  PluginSettings,
} from '../plugins/plugins';
import { PluginStatus } from '../plugins/runtime';

export const pluginOperations = {
  'plugin.list': {
    id: 'plugin.list',
    label: 'List Plugins',
    description:
      'List available Plugins, their capabilities and current status.',
    params: z.strictObject({}).default({}),
    result: PluginList,
    tier: 'read',
    keywords: ['extensions', 'settings', 'status'],
  },
  'plugin.activate': {
    id: 'plugin.activate',
    label: 'Start Plugin',
    description:
      'Start an enabled Plugin and report its running or failed status.',
    params: PluginActivation.strict(),
    result: PluginStatus,
    tier: 'confirm',
    keywords: ['extensions', 'start', 'load'],
  },
  'plugin.setEnabled': {
    id: 'plugin.setEnabled',
    label: 'Turn Plugin on or off',
    description:
      'Enable or disable a Plugin. Disabling stops its worker and open views.',
    params: PluginEnablement.strict(),
    result: z.strictObject({ ok: z.literal(true) }),
    tier: 'confirm',
    keywords: ['extensions', 'enable', 'disable', 'settings'],
  },
  'plugin.getSettings': {
    id: 'plugin.getSettings',
    label: 'Read Plugin settings',
    description:
      'Read a Plugin’s setting values and whether each secret is set, without secret values.',
    params: PluginActivation.strict(),
    result: PluginSettings,
    tier: 'read',
    keywords: ['extensions', 'settings', 'configuration'],
  },
  'plugin.setSetting': {
    id: 'plugin.setSetting',
    label: 'Change Plugin setting',
    description:
      'Save one Plugin setting. An empty secret clears it from the Keychain.',
    params: PluginSettingChange.strict(),
    result: z.strictObject({ ok: z.literal(true) }),
    tier: 'confirm',
    keywords: ['extensions', 'settings', 'configuration', 'secret'],
  },
} as const;
