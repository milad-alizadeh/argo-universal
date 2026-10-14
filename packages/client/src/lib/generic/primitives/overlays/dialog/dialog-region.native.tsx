import type { ReactElement } from 'react';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import type { DialogRegionProps } from './dialog-region.types';

// The region opens tall and its content owns scrolling, so actions at its foot stay in view.
export function DialogRegion(props: DialogRegionProps): ReactElement {
  return (
    <BottomSheet
      open
      initialSize="expanded"
      contentScrolls
      label={props.label}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      {props.children}
    </BottomSheet>
  );
}
