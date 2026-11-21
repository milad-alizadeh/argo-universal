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
  // An `ask` Operation that asks only when this param has one of these values; any other run is allowed.
  askWhen: z.object({ param: z.string(), is: z.array(z.string()) }).optional(),
  keywords: z.array(z.string()).readonly(),
  enabled: z.boolean(),
  disabledReason: z.string().nullable(),
});

export type OperationRow = z.infer<typeof OperationRow>;

export const discoveryOperation = {
  id: 'operations.list',
  label: 'Discover Operations',
  icon: 'search',
} as const;

export const operationFeedRowId = (toolCallId: string): string =>
  `argo:${toolCallId}`;
