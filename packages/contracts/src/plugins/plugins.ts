import { z } from 'zod';
import { pluginStateColumns } from '../columns';
import { PluginCapability } from './capabilities';
import { HookEventName } from './hooks';
import { materialSymbolNames } from './material-symbol-names.gen';
import { PluginStatus } from './runtime';
import { sfSymbolNames } from './sf-symbol-names.gen';
import { SlotId } from './wire';

const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);

// Zod's default enum error would print every name in the list.
const notIn =
  (catalogue: string) =>
  ({ input }: { input: unknown }): string =>
    `${String(input)} is not in ${catalogue}`;

const sfSymbol = z.enum(sfSymbolNames, { error: notIn('SF Symbols 6.0') });

const materialSymbol = z.enum(materialSymbolNames, {
  error: notIn('Material Symbols'),
});

// A Plugin targets iOS and macOS, Android and the web, or both, so either name may be missing (ADR-0025).
export const PluginIcon = z
  .strictObject({
    sf: sfSymbol.optional(),
    sfFilled: sfSymbol.optional(),
    material: materialSymbol.optional(),
  })
  .refine(
    (icon) => icon.sf !== undefined || icon.material !== undefined,
    'icon needs an sf or a material name',
  )
  .refine(
    (icon) => icon.sfFilled === undefined || icon.sf !== undefined,
    'icon.sfFilled needs an sf name',
  );

export type PluginIcon = z.infer<typeof PluginIcon>;

const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);

const settingField = {
  key: PluginIdentifier,
  label: z.string().trim().min(1),
  // Drawn as the field's section footer.
  description: z.string().trim().min(1).optional(),
};

// The four field types the App draws with its own rows; Plugins never draw Settings (ADR-0025).
export const PluginSettingField = z.discriminatedUnion('type', [
  z.strictObject({
    ...settingField,
    type: z.literal('text'),
    default: z.string().optional(),
  }),
  // Kept in the Keychain on the Server's Mac; the App only learns whether one is set.
  z.strictObject({ ...settingField, type: z.literal('secret') }),
  z.strictObject({
    ...settingField,
    type: z.literal('toggle'),
    default: z.boolean().optional(),
  }),
  z.strictObject({
    ...settingField,
    type: z.literal('picker'),
    options: z
      .array(
        z.strictObject({
          value: z.string().min(1),
          label: z.string().trim().min(1),
        }),
      )
      .min(1),
    default: z.string().optional(),
  }),
]);

export type PluginSettingField = z.infer<typeof PluginSettingField>;

const pickerDefaultListed = (field: PluginSettingField): boolean =>
  field.type !== 'picker' ||
  field.default === undefined ||
  field.options.some((option) => option.value === field.default);

export const PluginSettingsSchema = z
  .array(PluginSettingField)
  .refine(
    (fields) =>
      new Set(fields.map((field) => field.key)).size === fields.length,
    'Setting keys must be unique',
  )
  .refine(
    (fields) => fields.every(pickerDefaultListed),
    'A picker default must be one of its options',
  );

export const PluginManifest = z.strictObject({
  id: PluginIdentifier,
  name: z.string().trim().min(1),
  version: z.string().min(1),
  engines: z.strictObject({ argo: z.string().trim().min(1) }),
  main: z
    .string()
    .regex(
      /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:js|mjs|cjs)$/,
    ),
  icon: PluginIcon,
  contributes: z.strictObject({
    nav: z
      .array(
        z.strictObject({
          id: PluginIdentifier,
          title: z.string().trim().min(1),
          path: PluginPath,
        }),
      )
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        'Nav ids must be unique',
      ),
    settings: PluginSettingsSchema.optional(),
    // The Slots the Plugin fills; core asks only these Plugins for a Slot's content.
    slots: z
      .array(SlotId)
      .refine(
        (slots) => new Set(slots).size === slots.length,
        'Slot ids must be unique',
      )
      .optional(),
    // The core events the Plugin hooks; its worker starts when one fires (ADR-0027).
    hooks: z
      .array(HookEventName)
      .refine(
        (events) => new Set(events).size === events.length,
        'Hook events must be unique',
      )
      .optional(),
  }),
  capabilities: z.array(PluginCapability).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifest>;

export const PluginActivation = z.object({ pluginId: PluginIdentifier });

export const PluginSettingValue = z.union([z.string(), z.boolean()]);

export type PluginSettingValue = z.infer<typeof PluginSettingValue>;

export const PluginEnablement = z.object({
  pluginId: PluginIdentifier,
  enabled: z.boolean(),
});

export const PluginSettingChange = z.object({
  pluginId: PluginIdentifier,
  key: PluginIdentifier,
  // An empty secret clears it from the Keychain.
  value: PluginSettingValue,
});

// Each field's value or default; a secret's value never leaves the Server, only whether it is set.
export const PluginSettings = z.object({
  values: z.record(z.string(), PluginSettingValue),
  secretsSet: z.array(z.string()),
});

export type PluginSettings = z.infer<typeof PluginSettings>;

// A plugin_state row as the Server reads it back.
export const PluginStateRecord = pluginStateColumns.extend({
  settings: z.record(z.string(), PluginSettingValue),
});

export const PluginList = z.object({
  plugins: z.array(
    z.object({
      manifest: PluginManifest,
      firstParty: z.boolean(),
      enabled: z.boolean(),
      ...PluginStatus.shape,
    }),
  ),
  errors: z.array(z.object({ directory: z.string(), message: z.string() })),
});

export type PluginList = z.infer<typeof PluginList>;

export {
  HookEventName,
  hookEvents,
  type HookAnswer,
  type HookEvent,
  type CoreHooks,
} from './hooks';

export {
  PluginCapability,
  isRefusedVariable,
  isSpecialHost,
  type FetchCapability,
  type ProcessCapability,
} from './capabilities';
