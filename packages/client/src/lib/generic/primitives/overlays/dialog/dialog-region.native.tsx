import type { ComponentType, ReactElement } from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import type { DialogRegionProps } from './dialog-props';

// The region rests at the full height and its content owns scrolling, so actions at its foot stay in view.
export function DialogRegion(props: DialogRegionProps): ReactElement {
  return (
    <Sheet
      open
      detents={['large']}
      contentScrolls
      label={props.label}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      {props.children}
    </Sheet>
  );
}

DialogRegion satisfies ComponentType<DialogRegionProps>;
