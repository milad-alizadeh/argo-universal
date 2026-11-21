import { z } from 'zod';
import { sessionColumns } from '../columns';
import { PluginIdentifier } from '../plugins/plugin-settings';
import {
  PluginActivation,
  PluginEnablement,
  PluginList,
  PluginManifest,
  PluginSettingChange,
  PluginSettings,
} from '../plugins/plugins';
import { PluginStatus } from '../plugins/runtime';
import {
  DraftChooseInput,
  DraftChooseOutput,
  DraftPickInput,
  DraftPickOutput,
} from './plugin-drafts';
import {
  PluginGuide,
  PluginGuideInput,
  PluginNewInput,
  PluginNewOutput,
} from './plugin-guide';
import { operationSchemaSummary } from './schema-json';

// A manifest spelled out is over a megabyte of schema; an Agent reading plugin.list needs only what it holds.
operationSchemaSummary.add(PluginManifest, {
  type: 'object',
  description:
    'The Plugin’s manifest, as its plugin.json declares it: id, name, version, entry, icon and what it contributes to the App.',
});

export const pluginOperations = {
  'plugin.list': {
    id: 'plugin.list',
    label: 'List Plugins',
    icon: 'plugins',
    description:
      'List available Plugins, their capabilities and current status.',
    params: z.strictObject({}).default({}),
    result: PluginList,
    tier: 'read',
    policy: 'allow',
    keywords: ['extensions', 'settings', 'status'],
  },
  'plugin.activate': {
    id: 'plugin.activate',
    label: 'Start Plugin',
    icon: 'plug',
    description:
      'Start an enabled Plugin and report its running or failed status.',
    params: PluginActivation.strict(),
    result: PluginStatus,
    tier: 'act',
    policy: 'allow',
    keywords: ['extensions', 'start', 'load'],
  },
  'plugin.draft.show': {
    id: 'plugin.draft.show',
    label: 'Show Draft',
    icon: 'plug',
    description:
      'Rebuild the Draft now, mid-Turn. Call it after finishing a Draft region, naming the region you will write next so Apps frame it; omit it after the last region. The worker swaps only when the build passes. A broken build keeps the current worker, so the Draft on screen never blanks, and the build error is returned as the refusal. Every other source change still waits for the Turn to end. Needs a Server running with --watch.',
    params: z.strictObject({
      pluginId: PluginIdentifier,
      // The region the Agent is writing next, which Apps frame until it lands; optional.
      region: z.string().min(1).optional(),
      sessionId: sessionColumns.shape.id
        .optional()
        .describe(
          'The Session whose Agent draws this Draft, which the author’s Choose answers to; the calling Session when left out.',
        ),
    }),
    result: z.strictObject({ ok: z.literal(true) }),
    tier: 'act',
    policy: 'allow',
    keywords: ['draft', 'design', 'rebuild', 'reload', 'region', 'variant'],
  },
  'plugin.draft.choose': {
    id: 'plugin.draft.choose',
    label: 'Choose Draft',
    icon: 'plug',
    description:
      'The author chooses in the App: records one Variant per region plus every comment for a Plugin’s Draft, and hands them to the Session whose Agent draws it. Only an App runs it.',
    params: DraftChooseInput,
    result: DraftChooseOutput,
    tier: 'act',
    policy: 'person-only',
    keywords: ['draft', 'choose', 'variant', 'comment', 'pick'],
  },
  'plugin.draft.pick': {
    id: 'plugin.draft.pick',
    label: 'Read Draft pick',
    icon: 'plug',
    description:
      'Read the author’s last choice for a Plugin’s Draft. Returns one Variant per region and the comments sent with it, or null before a choice. Read it to resume after a restart, then write the chosen-variant file into the Plugin folder.',
    params: DraftPickInput,
    result: DraftPickOutput,
    tier: 'read',
    policy: 'allow',
    keywords: ['draft', 'pick', 'variant', 'comment', 'design', 'resume'],
  },
  'plugin.setEnabled': {
    id: 'plugin.setEnabled',
    label: 'Turn Plugin on or off',
    icon: 'plug',
    description:
      'Enable or disable a Plugin. Disabling stops its worker and open views.',
    params: PluginEnablement.strict(),
    result: z.strictObject({ ok: z.literal(true) }),
    tier: 'act',
    policy: 'allow',
    keywords: ['extensions', 'enable', 'disable', 'settings'],
  },
  'plugin.getSettings': {
    id: 'plugin.getSettings',
    label: 'Read Plugin settings',
    icon: 'settings',
    description:
      'Read a Plugin’s setting values and whether each secret is set, without secret values.',
    params: PluginActivation.strict(),
    result: PluginSettings,
    tier: 'read',
    policy: 'allow',
    keywords: ['extensions', 'settings', 'configuration'],
  },
  'plugin.setSetting': {
    id: 'plugin.setSetting',
    label: 'Change Plugin setting',
    icon: 'settings',
    description:
      'Save one Plugin setting. An empty secret clears it from the secret store.',
    params: PluginSettingChange.strict(),
    result: z.strictObject({ ok: z.literal(true) }),
    tier: 'act',
    policy: 'allow',
    keywords: ['extensions', 'settings', 'configuration', 'secret'],
  },
  'plugin.guide': {
    id: 'plugin.guide',
    label: 'Plugin blueprint',
    icon: 'guide',
    description:
      'Read how to build, create or scaffold an Argo Plugin: the blueprint and an index of kit components; pass components to read their props. Read it before building a Plugin, then run plugin.new.',
    params: PluginGuideInput,
    result: PluginGuide,
    tier: 'read',
    policy: 'allow',
    keywords: [
      'plugin',
      'build',
      'create',
      'scaffold',
      'blueprint',
      'guide',
      'kit',
      'component',
      'extension',
    ],
  },
  'plugin.new': {
    id: 'plugin.new',
    label: 'New Plugin',
    icon: 'plugins',
    description:
      'Write a working Plugin into a Session Checkout: one page, one Operation and one passing test. Run plugin.guide first.',
    params: PluginNewInput,
    result: PluginNewOutput,
    tier: 'act',
    policy: 'allow',
    keywords: ['plugin', 'build', 'create', 'scaffold', 'template', 'new'],
  },
} as const;
