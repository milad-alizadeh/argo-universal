import { cloneElement, type ReactElement } from 'react';
import type { SheetProps } from './sheet-props';

// The phone sheets' trigger: the caller's own control, its press opening the sheet.
export function SheetTrigger(props: SheetProps): ReactElement | null {
  if (!props.trigger) return null;

  return cloneElement(props.trigger, {
    onPress: () => props.onOpenChange(true),
  });
}
