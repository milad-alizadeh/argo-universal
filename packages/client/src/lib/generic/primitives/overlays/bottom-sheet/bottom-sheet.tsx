import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import type { BottomSheetProps } from './bottom-sheet-props';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetSurface } from './bottom-sheet-surface';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import { SheetPages } from './sheet-pages';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  return (
    <BottomSheetRoot {...props}>
      {props.trigger && <BottomSheetTrigger trigger={props.trigger} />}
      <SheetSurface {...props} />
    </BottomSheetRoot>
  );
}

type SurfaceProps = React.ComponentProps<typeof BottomSheetSurface>;

function SheetSurface(props: BottomSheetProps): React.JSX.Element {
  return (
    <BottomSheetSurface
      {...surfaceProps(props)}
      title={<SheetTitle label={props.label} />}
    >
      <SheetPages open={props.open}>{props.children}</SheetPages>
    </BottomSheetSurface>
  );
}

function surfaceProps(
  props: BottomSheetProps,
): Omit<SurfaceProps, 'children' | 'title'> {
  return {
    label: props.label,
    open: props.open,
    onClosed: props.onClosed,
    dismissible: props.dismissible,
    expandable: props.expandable,
    initialSize: props.initialSize,
    footer: props.footer,
    variant: props.variant,
  };
}

function SheetTitle(props: { label?: string }): React.JSX.Element {
  return (
    <DialogPrimitive.Title className="sr-only">
      {props.label}
    </DialogPrimitive.Title>
  );
}

BottomSheet satisfies React.ComponentType<BottomSheetProps>;
