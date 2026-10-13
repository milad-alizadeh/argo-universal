import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetSurface } from './bottom-sheet-surface.web';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  return (
    <BottomSheetRoot {...props}>
      {props.trigger && <BottomSheetTrigger trigger={props.trigger} />}
      <BottomSheetSurface
        open={props.open}
        onClosed={props.onClosed}
        dismissible={props.dismissible}
        title={<SheetTitle label={props.label} />}
      >
        {props.children}
      </BottomSheetSurface>
    </BottomSheetRoot>
  );
}

function SheetTitle(props: Pick<BottomSheetProps, 'label'>): React.JSX.Element {
  return (
    <DialogPrimitive.Title className="sr-only">
      {props.label}
    </DialogPrimitive.Title>
  );
}
