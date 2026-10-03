import { z } from 'zod';
import { SessionConfigOption } from './set-config-option';

export const SessionState = z.enum(['running', 'idle', 'requires_action']);
export type SessionState = z.infer<typeof SessionState>;

// ACP `usage_update`: how full the context window is.
export const ContextUsage = z.strictObject({
  used: z.int().nonnegative(),
  size: z.int().nonnegative(),
  cost: z
    .strictObject({
      amount: z.number(),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .optional(),
});
export type ContextUsage = z.infer<typeof ContextUsage>;

export const PermissionOptionKind = z.enum([
  'allow_once',
  'allow_always',
  'reject_once',
  'reject_always',
]);
export type PermissionOptionKind = z.infer<typeof PermissionOptionKind>;

export const PermissionOption = z.strictObject({
  optionId: z.string().min(1),
  name: z.string(),
  kind: PermissionOptionKind,
});
export type PermissionOption = z.infer<typeof PermissionOption>;

// A Permission request, after ACP `session/request_permission`.
export const PendingPermission = z.strictObject({
  toolCallId: z.string().min(1),
  title: z.string(),
  options: z.array(PermissionOption).min(1),
});
export type PendingPermission = z.infer<typeof PendingPermission>;

// ACP `EnumOption`.
export const ElicitationEnumOption = z.strictObject({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
});
export type ElicitationEnumOption = z.infer<typeof ElicitationEnumOption>;

const propertyBase = {
  title: z.string().optional(),
  description: z.string().optional(),
};

// ACP `ElicitationPropertySchema`: one field of an Elicitation form.
export const ElicitationPropertySchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...propertyBase,
    type: z.literal('string'),
    minLength: z.int().nonnegative().optional(),
    maxLength: z.int().nonnegative().optional(),
    pattern: z.string().optional(),
    format: z.enum(['email', 'uri', 'date', 'date-time']).optional(),
    default: z.string().optional(),
    enum: z.array(z.string()).min(1).optional(),
    oneOf: z.array(ElicitationEnumOption).min(1).optional(),
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
    minItems: z.int().nonnegative().optional(),
    maxItems: z.int().nonnegative().optional(),
    items: z.union([
      z.strictObject({
        type: z.literal('string'),
        enum: z.array(z.string()).min(1),
      }),
      z.strictObject({ anyOf: z.array(ElicitationEnumOption).min(1) }),
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
  mode: z.literal('form'),
  message: z.string(),
  requestedSchema: ElicitationSchema,
  toolCallId: z.string().min(1).optional(),
});
export type PendingElicitation = z.infer<typeof PendingElicitation>;

// The live state of a Session that is not a Feed row.
export const SessionSnapshot = z.strictObject({
  state: SessionState,
  activeTurnId: z.string().min(1).nullable(),
  usage: ContextUsage.nullable(),
  pendingPermission: PendingPermission.nullable(),
  pendingElicitation: PendingElicitation.nullable(),
  configOptions: z.array(SessionConfigOption),
  maxRevision: z.int().nonnegative(),
  epoch: z.int().nonnegative(),
});
export type SessionSnapshot = z.infer<typeof SessionSnapshot>;
