import type * as React from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import { useDialogState } from './dialog-context';
import type { DialogSheetProps } from './dialog-props';

// A narrow window, phone or web, presents the dialog as a sheet as tall as its content, opened and closed by the dialog's root.
export function DialogSheet(props: DialogSheetProps): React.JSX.Element {
  const { open, onOpenChange } = useDialogState();

  return (
    <Sheet
      open={props.open ?? open}
      onOpenChange={onOpenChange}
      label={props.label}
      dismissible={props.dismissible}
    >
      {props.children}
    </Sheet>
  );
}

DialogSheet satisfies React.ComponentType<DialogSheetProps>;
