import type { ReactElement } from 'react';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import type { DialogRegionProps } from './dialog-region.types';

export function DialogRegion(props: DialogRegionProps): ReactElement {
  return (
    <BottomSheet
      open
      label={props.label}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      {props.children}
    </BottomSheet>
  );
}
