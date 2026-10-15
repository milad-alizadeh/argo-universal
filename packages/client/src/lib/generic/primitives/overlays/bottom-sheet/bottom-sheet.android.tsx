// Stock Compose sheet: universal BottomSheet has no ref (expand, partialExpand), no sheetGesturesEnabled and no after-hide onClosed.
import { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useEffect } from 'react';
import { Host } from '#primitives/native/host';
import { BottomSheetContent } from './bottom-sheet-content';
import {
  useSheetDismissal,
  type SheetRef,
} from './bottom-sheet-dismissal.android';
import {
  HostedSheetContent as FittedSheetContent,
  SheetDragHandle,
} from './bottom-sheet-hosted-content.android';
import type { BottomSheetProps } from './bottom-sheet-props';
import { BottomSheetRoot } from './bottom-sheet-root.native';
import { BottomSheetTrigger } from './bottom-sheet-trigger.native';
import { SheetViewport } from './bottom-sheet-viewport.android';

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
  const modalProps = useModalProps(props, sheetRef);
  useInitialExpand(sheetRef, startsExpanded(props));

  return (
    <SheetHost>
      <ModalBottomSheet {...modalProps} ref={sheetRef}>
        {props.fit && <SheetDragHandle />}
        <HostedSheetContent {...props} />
      </ModalBottomSheet>
    </SheetHost>
  );
}

type ModalProps = Omit<
  React.ComponentProps<typeof ModalBottomSheet>,
  'children' | 'ref'
>;

function useModalProps(
  props: Omit<SheetProps, 'sheetRef'>,
  sheetRef: SheetRef,
): ModalProps {
  const dismissible = props.dismissible !== false;

  return {
    onDismissRequest: () => dismissOrCollapse(props, sheetRef),
    sheetGesturesEnabled: dismissible || props.expandable === true,
    properties: dismissProperties(dismissible),
  };
}

function dismissProperties(dismissible: boolean): ModalProps['properties'] {
  return {
    shouldDismissOnBackPress: dismissible,
    shouldDismissOnClickOutside: dismissible,
  };
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
  | 'variant'
  | 'contentScrolls'
  | 'surface'
> & { sheetRef: SheetRef };

function HostedSheetContent(
  props: Omit<SheetProps, 'sheetRef'>,
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
  props: Pick<BottomSheetProps, 'variant' | 'initialSize'>,
): boolean {
  return props.variant === 'form' || props.initialSize === 'expanded';
}

/*
 * Expand once the sheet is on screen. Stock Expo UI's initialFullyExpanded calls expand() while
 * Material is still settling the sheet's anchors, so the sheet stays half open. Until the sheet's
 * first composition binds its handler, expand() rejects; try again on the next frame.
 */
function useInitialExpand(sheetRef: SheetRef, expand: boolean): void {
  useEffect(() => {
    if (!expand) return;

    return expandOnNextFrame(sheetRef, expandAttempts);
  }, [sheetRef, expand]);
}

const expandAttempts = 10;

function expandOnNextFrame(sheetRef: SheetRef, attempts: number): () => void {
  const pending = { frame: 0, cancelled: false };

  const attempt = (left: number): void => {
    pending.frame = requestAnimationFrame(() => {
      sheetRef.current?.expand().catch(() => {
        if (!pending.cancelled && left > 1) attempt(left - 1);
      });
    });
  };

  attempt(attempts);

  return (): void => {
    pending.cancelled = true;
    cancelAnimationFrame(pending.frame);
  };
}

BottomSheet satisfies React.ComponentType<BottomSheetProps>;
