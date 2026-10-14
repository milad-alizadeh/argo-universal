import type * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import type { ComponentProps } from 'react';

export type CollapsibleProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Root>,
  'asChild'
>;

export type CollapsibleContentProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
>;
