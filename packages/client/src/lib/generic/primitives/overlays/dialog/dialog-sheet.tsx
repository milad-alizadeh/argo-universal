import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';

export type DialogSheetProps = { label?: string; children: React.ReactNode };

// A native phone presents the dialog as the platform's bottom sheet, opened and closed by the dialog's root.
export function DialogSheet(props: DialogSheetProps): React.JSX.Element {
  const { open, onOpenChange } = DialogPrimitive.useRootContext();
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      label={props.label}
      fit
    >
      {props.children}
    </BottomSheet>
  );
}
