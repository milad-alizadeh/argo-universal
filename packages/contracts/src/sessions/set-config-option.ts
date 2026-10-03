import { z } from 'zod';

// ACP v2 `SessionConfigSelectOption`.
export const SessionConfigSelectOption = z.strictObject({
  value: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
});
export type SessionConfigSelectOption = z.infer<
  typeof SessionConfigSelectOption
>;

// ACP v2 `SessionConfigSelectGroup`.
export const SessionConfigSelectGroup = z.strictObject({
  groupId: z.string().min(1),
  name: z.string(),
  options: z.array(SessionConfigSelectOption),
});
export type SessionConfigSelectGroup = z.infer<typeof SessionConfigSelectGroup>;

// Mode, model, and effort (`thought_level`) are the categories Argo shows.
export const SessionConfigOptionCategory = z.enum([
  'mode',
  'model',
  'model_config',
  'thought_level',
]);
export type SessionConfigOptionCategory = z.infer<
  typeof SessionConfigOptionCategory
>;

const configOptionBase = {
  configId: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  category: SessionConfigOptionCategory.optional(),
};

// ACP v2 `SessionConfigOption`, one of `select` or `boolean`.
export const SessionConfigOption = z.discriminatedUnion('type', [
  z.strictObject({
    ...configOptionBase,
    type: z.literal('select'),
    currentValue: z.string().min(1),
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
    sessionId: z.string().min(1),
    configId: z.string().min(1),
    type: z.literal('id'),
    value: z.string().min(1),
  }),
  z.strictObject({
    sessionId: z.string().min(1),
    configId: z.string().min(1),
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
