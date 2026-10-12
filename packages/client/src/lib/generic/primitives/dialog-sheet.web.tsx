import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { BottomSheetSurface } from './bottom-sheet-surface.web';
import type { DialogSheetProps } from './dialog-sheet';

// A narrow web window draws the dialog as a bottom sheet; the dialog's own title names it.
export function DialogSheet(props: DialogSheetProps): React.JSX.Element {
  const { open } = DialogPrimitive.useRootContext();
  return (
    <BottomSheetSurface open={open} hiddenWhileClosing>
      {props.children}
    </BottomSheetSurface>
  );
}
