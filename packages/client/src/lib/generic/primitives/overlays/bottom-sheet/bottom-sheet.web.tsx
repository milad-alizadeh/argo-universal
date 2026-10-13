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
        label={props.label}
        open={props.open}
        onClosed={props.onClosed}
        dismissible={props.dismissible}
        expandable={props.expandable}
        initialSize={props.initialSize}
        footer={props.footer}
        size={props.size}
        title={
          <DialogPrimitive.Title className="sr-only">
            {props.label}
          </DialogPrimitive.Title>
        }
      >
        {props.children}
      </BottomSheetSurface>
    </BottomSheetRoot>
  );
}
