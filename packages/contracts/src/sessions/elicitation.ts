import { z } from 'zod';

// ACP `EnumOption`.
export const ElicitationEnumOption = z.strictObject({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

export type ElicitationEnumOption = z.infer<typeof ElicitationEnumOption>;

const propertyBase = {
  _meta: z.record(z.string(), z.unknown()).nullish(),
  title: z.string().optional(),
  description: z.string().optional(),
};

// ACP `ElicitationPropertySchema`: one field of an Elicitation form.
export const ElicitationPropertySchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...propertyBase,
    type: z.literal('string'),
    minLength: z.int().optional(),
    maxLength: z.int().optional(),
    pattern: z.string().optional(),
    format: z.enum(['email', 'uri', 'date', 'date-time']).optional(),
    default: z.string().optional(),
    enum: z.array(z.string()).optional(),
    oneOf: z.array(ElicitationEnumOption).optional(),
  }),
  z.strictObject({
    ...propertyBase,
    type: z.literal('number'),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    default: z.number().optional(),
  }),
  z.strictObject({
    ...propertyBase,
    type: z.literal('integer'),
    minimum: z.int().optional(),
    maximum: z.int().optional(),
    default: z.int().optional(),
  }),
  z.strictObject({
    ...propertyBase,
    type: z.literal('boolean'),
    default: z.boolean().optional(),
  }),
  z.strictObject({
    ...propertyBase,
    type: z.literal('array'),
    minItems: z.int().optional(),
    maxItems: z.int().optional(),
    items: z.union([
      z.strictObject({
        type: z.literal('string'),
        enum: z.array(z.string()),
      }),
      z.strictObject({ anyOf: z.array(ElicitationEnumOption) }),
    ]),
    default: z.array(z.string()).optional(),
  }),
]);

export type ElicitationPropertySchema = z.infer<
  typeof ElicitationPropertySchema
>;

// ACP `ElicitationSchema`: the form an Elicitation asks the user to fill in.
export const ElicitationSchema = z.strictObject({
  type: z.literal('object').optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  properties: z.record(z.string(), ElicitationPropertySchema),
  required: z.array(z.string()).optional(),
});

export type ElicitationSchema = z.infer<typeof ElicitationSchema>;

// An Elicitation, after ACP `elicitation/create` in form mode, scoped to this Session.
export const PendingElicitation = z.strictObject({
  requestId: z.string(),
  mode: z.literal('form'),
  message: z.string(),
  requestedSchema: ElicitationSchema,
  toolCallId: z.string().optional(),
});

export type PendingElicitation = z.infer<typeof PendingElicitation>;
