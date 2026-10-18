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
import { materialSymbolNames } from './material-symbol-names.gen';
import { sfSymbolNames } from './sf-symbol-names.gen';
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

export const listProps = z.object({});

export const contentListProps = z.object({
  appearance: z.enum(['plain', 'grouped', 'cards']).optional(),
  isLoading: z.boolean().optional(),
});

export const listSectionProps = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  footer: z.string().optional(),
});

export const progressBarProps = z.object({
  value: z.number().min(0).max(1),
  tone: z.enum(tones).optional(),
  active: z.boolean().optional(),
  accessibilityLabel: z.string().optional(),
});

export const labelProps = z.object({
  icon: z.object({
    sf: z.enum(sfSymbolNames),
    material: z.enum(materialSymbolNames),
  }),
  text: z.string(),
  tone: z.enum(tones).optional(),
  accessibilityLabel: z.string().optional(),
});

export const pillProps = z.object({
  text: z.string(),
  tone: z.enum(tones).optional(),
});

export const listItemProps = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  value: z.string().optional(),
  badge: z.number().int().nonnegative().optional(),
  progress: progressBarProps.optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
  accessibilityLabel: z.string().optional(),
  onPress: pressHandler.optional(),
});

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']),
});
