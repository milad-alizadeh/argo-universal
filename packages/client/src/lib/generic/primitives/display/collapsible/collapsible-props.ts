import type * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import type { ComponentProps, ReactNode } from 'react';
import type { Tone } from '#primitives/display/text';
import type { IconName } from '../../../symbols/icon-names';

export type CollapsibleProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Root>,
  'asChild'
>;

export type CollapsibleContentProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
>;

export interface CollapsibleHeaderProps {
  // Names the trigger for assistive technology, and is its text unless children replace it.
  label: string;
  icon?: IconName;
  // Colours the icon; the label and chevron keep the header's colour.
  iconTone?: Tone;
  // Replaces the label text, between the icon and the chevron; hover is read with useCollapsibleHovered.
  children?: ReactNode;
}
