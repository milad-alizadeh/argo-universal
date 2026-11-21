import { z } from 'zod';
import { iconNames } from '#kit-symbols/icon-map';

export const OperationTier = z.enum(['read', 'act', 'confirm']);

export type OperationTier = z.infer<typeof OperationTier>;

export const OperationIcon = z.enum(iconNames);

export const OperationPolicy = z.enum([
  'allow',
  'ask',
  'person-only',
  'archive',
  'ask-outside-project',
]);

export type OperationPolicy = z.infer<typeof OperationPolicy>;

// An `ask` Operation asks only when `param` has one of the values `is`; any other run is allowed.
export const OperationAskWhen = z.strictObject({
  param: z.string().min(1),
  is: z.array(z.string().min(1)).min(1),
});

export const OperationRow = z.object({
  id: z.string(),
  label: z.string(),
  icon: OperationIcon.optional(),
  description: z.string(),
  params: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  tier: OperationTier,
  policy: OperationPolicy,
  canRequestApproval: z.boolean().optional(),
  askWhen: OperationAskWhen.optional(),
  keywords: z.array(z.string()).readonly(),
  enabled: z.boolean(),
  disabledReason: z.string().nullable(),
});

export type OperationRow = z.infer<typeof OperationRow>;

export const OperationInputRow = OperationRow.omit({ result: true });

export type OperationInputRow = z.infer<typeof OperationInputRow>;

export const discoveryOperation = {
  id: 'operations.list',
  label: 'Discover Operations',
  icon: 'search',
} as const;

export const operationFeedRowId = (toolCallId: string): string =>
  `argo:${toolCallId}`;
