import { z } from 'zod';
import { sessionColumns } from '../columns';

const configOptionIcons = [
  'ShieldWarning',
  'Pencil',
  'MapTrifold',
  'Sparkles',
  'WarningTriangle',
] as const;
export type ConfigOptionIcon = (typeof configOptionIcons)[number];
const knownIcons = new Set<string>(configOptionIcons);
let unknownIcons = 0;

// ACP extension fields are kept; Argo's known fields are checked at this boundary.
export const ConfigOptionMeta = z.looseObject({
  argo: z
    .looseObject({
      icon: z
        .string()
        .transform((icon): string => {
          if (!knownIcons.has(icon)) unknownIcons += 1;
          return icon;
        })
        .optional(),
      shortName: z.string().optional(),
      tone: z.enum(['planning', 'safe', 'moderate', 'dangerous']).optional(),
      supportsEffort: z.boolean().optional(),
      supportedEffortLevels: z.array(z.string()).optional(),
      supportsImages: z.boolean().optional(),
      supportsAdaptiveThinking: z.boolean().optional(),
      supportsFastMode: z.boolean().optional(),
      supportsAutoMode: z.boolean().optional(),
      supportsPersonality: z.boolean().optional(),
      heldUntilNextTurn: z.boolean().optional(),
    })
    .optional(),
});

// ACP v2 `SessionConfigSelectOption`.
export const SessionConfigSelectOption = z.strictObject({
  value: z.string(),
  name: z.string(),
  description: z.string().optional(),
  _meta: ConfigOptionMeta.optional(),
});
export type SessionConfigSelectOption = z.infer<
  typeof SessionConfigSelectOption
>;

// ACP v2 `SessionConfigSelectGroup`.
export const SessionConfigSelectGroup = z.strictObject({
  groupId: z.string(),
  _meta: ConfigOptionMeta.optional(),
  name: z.string(),
  options: z.array(SessionConfigSelectOption),
});
export type SessionConfigSelectGroup = z.infer<typeof SessionConfigSelectGroup>;

const knownCategories = new Set([
  'mode',
  'model',
  'model_config',
  'thought_level',
]);
let unknownCategories = 0;

// Unknown categories are kept for ACP extensions and counted on boundary validation.
export const SessionConfigOptionCategory = z
  .string()
  .transform((category): string => {
    if (!knownCategories.has(category)) {
      unknownCategories += 1;
    }
    return category;
  });
export function getConfigOptionDiagnostics(): {
  unknownCategories: number;
  unknownIcons: number;
} {
  return { unknownCategories, unknownIcons };
}
export type SessionConfigOptionCategory = z.infer<
  typeof SessionConfigOptionCategory
>;

const configOptionBase = {
  configId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  _meta: ConfigOptionMeta.optional(),
  category: SessionConfigOptionCategory.optional(),
};

// ACP v2 `SessionConfigOption`, one of `select` or `boolean`.
export const SessionConfigOption = z.discriminatedUnion('type', [
  z.strictObject({
    ...configOptionBase,
    type: z.literal('select'),
    currentValue: z.string(),
    options: z.union([
      z.array(SessionConfigSelectOption),
      z.array(SessionConfigSelectGroup),
    ]),
  }),
  z.strictObject({
    ...configOptionBase,
    type: z.literal('boolean'),
    currentValue: z.boolean(),
  }),
]);
export type SessionConfigOption = z.infer<typeof SessionConfigOption>;

// Input of `session.setConfigOption`, after ACP v2 `SetSessionConfigOptionRequest`.
export const SessionSetConfigOptionInput = z.discriminatedUnion('type', [
  z.strictObject({
    sessionId: sessionColumns.shape.id,
    configId: z.string(),
    type: z.literal('id'),
    value: z.string(),
  }),
  z.strictObject({
    sessionId: sessionColumns.shape.id,
    configId: z.string(),
    type: z.literal('boolean'),
    value: z.boolean(),
  }),
]);
export type SessionSetConfigOptionInput = z.infer<
  typeof SessionSetConfigOptionInput
>;

export const SessionSetConfigOptionOutput = z.strictObject({
  configOptions: z.array(SessionConfigOption),
});
export type SessionSetConfigOptionOutput = z.infer<
  typeof SessionSetConfigOptionOutput
>;
