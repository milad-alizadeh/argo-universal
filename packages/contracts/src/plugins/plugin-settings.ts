import { z } from 'zod';
import { pluginStateColumns } from '../columns';

export const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);

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
