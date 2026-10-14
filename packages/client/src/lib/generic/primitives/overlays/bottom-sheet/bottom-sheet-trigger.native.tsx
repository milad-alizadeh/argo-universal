import { cloneElement, type ReactElement } from 'react';
import { useSheetOpenChange } from './bottom-sheet-root.native';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheetTrigger(
  props: Required<Pick<BottomSheetProps, 'trigger'>>,
): ReactElement {
  const onOpenChange = useSheetOpenChange();

  return cloneElement(props.trigger, { onPress: () => onOpenChange(true) });
}
