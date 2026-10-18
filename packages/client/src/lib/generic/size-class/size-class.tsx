import type * as React from 'react';
import type { SizeClassValues } from '../use-size-class/size-class-value';
import { useSizeClassValue } from '../use-size-class/use-size-class-value';

// `only="wide"` draws on a medium window too: medium lays out like wide unless given its own slot.
type SizeClassProps =
  | { only: 'compact' | 'wide'; children: React.ReactNode }
  | SizeClassValues<React.ReactNode>;

/*
 * Content drawn at one size class only, such as a phone's own header, or one slot per size class.
 * Both slots draw in one place, so the same part in each keeps its state as the window crosses a size class.
 */
export function SizeClass(props: SizeClassProps): React.ReactNode {
  return useSizeClassValue(slots(props));
}

function slots(props: SizeClassProps): SizeClassValues<React.ReactNode> {
  if (!('only' in props)) return props;

  return { compact: null, wide: null, [props.only]: props.children };
}
