import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheetRoot({
  style,
  open,
  onOpenChange,
  children,
}: Pick<BottomSheetProps, 'style' | 'open' | 'onOpenChange'> & {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DialogPrimitive.Root style={style} open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}
