import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { BottomSheetSurface } from '#primitives/overlays/bottom-sheet';
import type { DialogSheetProps } from './dialog-sheet.types';

// A narrow web window draws the dialog as a bottom sheet, named by its label or else by the dialog's own title.
export function DialogSheet(props: DialogSheetProps): React.JSX.Element {
  const { open } = DialogPrimitive.useRootContext();

  return (
    <BottomSheetSurface
      open={open}
      hiddenWhileClosing
      dismissible={props.dismissible}
      onCloseAutoFocus={props.onCloseAutoFocus}
      title={props.label && <SheetLabel label={props.label} />}
    >
      {props.children}
    </BottomSheetSurface>
  );
}

function SheetLabel({ label }: { label: string }): React.JSX.Element {
  return (
    <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
  );
}
