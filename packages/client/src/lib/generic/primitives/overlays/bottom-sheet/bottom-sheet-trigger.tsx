import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import type { BottomSheetProps } from './bottom-sheet-props';

export function BottomSheetTrigger({
  trigger,
}: Required<Pick<BottomSheetProps, 'trigger'>>): React.JSX.Element {
  return (
    <DialogPrimitive.Trigger asChild disabled={!!trigger.props.disabled}>
      {trigger}
    </DialogPrimitive.Trigger>
  );
}
