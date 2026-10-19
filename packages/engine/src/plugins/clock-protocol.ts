import { z } from 'zod';

export const ClockCommand = z.object({
  type: z.literal('clock.advance'),
  id: z.number().int().nonnegative(),
  ms: z.number().finite().nonnegative(),
});

export const ClockReply = z.object({
  type: z.literal('clock.advanced'),
  id: z.number().int().nonnegative(),
  error: z.string().optional(),
});

export type ClockReply = z.infer<typeof ClockReply>;
