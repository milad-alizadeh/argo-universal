import { cloneElement, type ReactElement } from 'react';
import type { BottomSheetProps } from './bottom-sheet-props';
import { useSheetOpenChange } from './bottom-sheet-root.native';

export function BottomSheetTrigger(
  props: Required<Pick<BottomSheetProps, 'trigger'>>,
): ReactElement {
  const onOpenChange = useSheetOpenChange();

  return cloneElement(props.trigger, { onPress: () => onOpenChange(true) });
}
