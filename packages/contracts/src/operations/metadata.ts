import { z } from 'zod';

export const OperationTier = z.enum(['read', 'act', 'confirm']);

export type OperationTier = z.infer<typeof OperationTier>;

export const OperationRow = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  params: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  tier: OperationTier,
  keywords: z.array(z.string()).readonly(),
  enabled: z.boolean(),
  disabledReason: z.string().nullable(),
});

export type OperationRow = z.infer<typeof OperationRow>;
