import { Handler } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import { textRoles } from '#primitives/content/text';
import { isStackGap, stackAlignments } from '#primitives/layout/stack';

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
  variant: z.enum(textRoles).optional(),
  tone: tone.optional(),
});

export const buttonProps = z.strictObject({
  label: z.string(),
  variant: z
    .enum(['default', 'outline', 'secondary', 'ghost', 'link'])
    .optional(),
  tone: z.literal('danger').optional(),
  size: z.enum(['xs', 'sm', 'md', 'lg']).optional(),
  disabled: z.boolean().optional(),
  onPress: Handler.optional(),
});

export const layoutProps = z.strictObject({
  gap: z.number().refine(isStackGap).optional(),
  align: z.enum(stackAlignments).optional(),
});

export const groupedItemProps = z.strictObject({
  label: z.string(),
  value: z.string().optional(),
  disabled: z.boolean().optional(),
  onPress: Handler.optional(),
});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']),
});
