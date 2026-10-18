import { z } from 'zod';
import {
  buttonSizes,
  buttonVariants,
  stackAlignments,
  isStackGap,
  type StackGap,
  textRoles,
  tones,
} from '../kit-tokens';
import { Action, WireEvent } from './wire';

const pressHandler = z.union([
  WireEvent.extend({ $event: z.literal('onPress') }),
  Action,
]);

export const textV1 = z.object({
  label: z.string(),
  variant: z.enum(textRoles).optional(),
  tone: z.enum(tones).optional(),
});

export const textProps = textV1.extend({
  accessibilityLabel: z.string().optional(),
});

export const buttonProps = z.object({
  label: z.string(),
  variant: z.enum(buttonVariants).optional(),
  tone: z.literal('danger').optional(),
  size: z.enum(buttonSizes).optional(),
  disabled: z.boolean().optional(),
  onPress: pressHandler.optional(),
});

export const layoutProps = z.object({
  gap: z
    .custom<StackGap>((value) => typeof value === 'number' && isStackGap(value))
    .optional(),
  align: z.enum(stackAlignments).optional(),
});

export const groupedItemProps = z.object({
  label: z.string(),
  value: z.string().optional(),
  disabled: z.boolean().optional(),
  onPress: pressHandler.optional(),
});

export const svgProps = z.object({
  xml: z.string().max(131_072),
  label: z.string().min(1),
  tone: z.enum(tones).optional(),
  aspectRatio: z.number().finite().positive().optional(),
  onPress: pressHandler.optional(),
});

export const listProps = z.object({});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']),
});
