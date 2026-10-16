import { Action, Handler } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

// Spacing props take only these scale steps.
export const gapSteps = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12] as const;

const gap = z.literal(gapSteps);

const tone = z.enum([
  'neutral',
  'muted',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'done',
]);

export const textProps = z.strictObject({
  label: z.string(),
  role: z.enum(['title', 'heading', 'body', 'secondary']).optional(),
  tone: tone.optional(),
});

export const buttonProps = z.strictObject({
  label: z.string(),
  variant: z.enum(['default', 'outline', 'secondary', 'ghost', 'link']).optional(),
  tone: z.literal('danger').optional(),
  size: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
  disabled: z.boolean().optional(),
  onPress: Handler.optional(),
});

export const layoutProps = z.strictObject({
  gap: gap.optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});

export { Action };
