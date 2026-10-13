import { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { Host } from '../../native/host';
import { useSheetColors } from './bottom-sheet-colors.android';
import { BottomSheetContent } from './bottom-sheet-content';
import {
  useSheetDismissal,
  type SheetRef,
} from './bottom-sheet-dismissal.android';
import {
  HostedSheetContent as FittedSheetContent,
  SheetDragHandle,
} from './bottom-sheet-hosted-content.android';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import { SheetViewport } from './bottom-sheet-viewport.android';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const { mounted, sheetRef } = useSheetDismissal(props.open, props.onClosed);
  return (
    <BottomSheetRoot {...props}>
      {props.trigger && <BottomSheetTrigger trigger={props.trigger} />}
      {mounted && <SheetPresentation {...props} sheetRef={sheetRef} />}
    </BottomSheetRoot>
  );
}

function SheetPresentation(presentation: SheetProps): React.JSX.Element {
  const { sheetRef, ...props } = presentation;
  const sheet = useSheetColors(props.surface);
  const dismissible = props.dismissible !== false;
  return (
    <SheetHost>
      <ModalBottomSheet
        {...sheet}
        ref={sheetRef}
        initialFullyExpanded={startsExpanded(props)}
        onDismissRequest={() => dismissOrCollapse(props, sheetRef)}
        sheetGesturesEnabled={dismissible || props.expandable === true}
        properties={{
          shouldDismissOnBackPress: dismissible,
          shouldDismissOnClickOutside: dismissible,
        }}
      >
        {props.fit && <SheetDragHandle />}
        <HostedSheetContent {...props} />
      </ModalBottomSheet>
    </SheetHost>
  );
}

type SheetProps = Pick<
  BottomSheetProps,
  | 'onOpenChange'
  | 'label'
  | 'children'
  | 'dismissible'
  | 'expandable'
  | 'footer'
  | 'initialSize'
  | 'fit'
  | 'size'
  | 'contentScrolls'
  | 'surface'
> & { sheetRef: SheetRef };
function HostedSheetContent(
  props: Pick<
    BottomSheetProps,
    | 'onOpenChange'
    | 'label'
    | 'children'
    | 'dismissible'
    | 'expandable'
    | 'footer'
    | 'initialSize'
    | 'fit'
    | 'size'
    | 'contentScrolls'
    | 'surface'
  >,
): React.JSX.Element {
  if (props.fit) return <FittedSheetContent {...props} />;
  return (
    <SheetViewport fit={props.fit}>
      {(viewportHeight) => (
        <BottomSheetContent {...props} viewportHeight={viewportHeight} />
      )}
    </SheetViewport>
  );
}

function SheetHost({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Host style={{ position: 'absolute' }} pointerEvents="none">
      {children}
    </Host>
  );
}

function dismissOrCollapse(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'dismissible'>,
  sheetRef: SheetRef,
): void {
  if (props.dismissible === false) {
    void sheetRef.current?.partialExpand();
    return;
  }
  props.onOpenChange(false);
}

function startsExpanded(
  props: Pick<BottomSheetProps, 'size' | 'initialSize'>,
): boolean {
  return props.size === 'form' || props.initialSize === 'expanded';
}
