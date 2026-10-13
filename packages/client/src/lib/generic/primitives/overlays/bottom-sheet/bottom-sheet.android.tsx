import {
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RNHostView,
} from '@expo/ui/jetpack-compose';
import { fillMaxHeight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Host } from '../../native/host';
import { usePresentationClosed } from '../../native/native-only-animated-view/native-only-animated-view';
import { useSheetColors } from './bottom-sheet-colors.android';
import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import type { BottomSheetProps } from './bottom-sheet.types';

type SheetRef = React.RefObject<ModalBottomSheetRef | null>;

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
        initialFullyExpanded={props.size === 'form'}
        onDismissRequest={() => props.onOpenChange(false)}
        sheetGesturesEnabled={dismissible}
        properties={{
          shouldDismissOnBackPress: dismissible,
          shouldDismissOnClickOutside: dismissible,
        }}
      >
        <HostedSheetContent {...props} />
      </ModalBottomSheet>
    </SheetHost>
  );
}

function useSheetDismissal(
  open: boolean,
  onClosed?: () => void,
): { mounted: boolean; sheetRef: SheetRef } {
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [mounted, setMounted] = useState(open);
  const closing = useRef(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    const sheet = sheetRef.current;
    return dismissSheet({ open, mounted, closing, setMounted, sheet });
  }, [open, mounted]);
  usePresentationClosed(mounted, onClosed);
  return { mounted, sheetRef };
}

type SheetDismissal = {
  open: boolean;
  mounted: boolean;
  sheet: ModalBottomSheetRef | null;
  closing: React.RefObject<boolean>;
  setMounted: (mounted: boolean) => void;
};

function dismissSheet(state: SheetDismissal): (() => void) | undefined {
  if (!state.mounted) return;
  return dismissMountedSheet(state);
}

function dismissMountedSheet(state: SheetDismissal): (() => void) | undefined {
  if (!state.sheet) return;
  if (state.open) {
    reopenSheet(state.sheet, state.closing);
    return;
  }
  state.closing.current = true;
  return hideSheet(state.sheet, state.setMounted);
}

function reopenSheet(
  sheet: ModalBottomSheetRef,
  closing: React.RefObject<boolean>,
): void {
  if (closing.current) void sheet.partialExpand();
  closing.current = false;
}

function hideSheet(
  sheet: ModalBottomSheetRef,
  setMounted: (mounted: boolean) => void,
): () => void {
  let cancelled = false;
  void sheet.hide().then(() => {
    if (!cancelled) setMounted(false);
  });
  return (): void => {
    cancelled = true;
  };
}

type SheetProps = Pick<
  BottomSheetProps,
  | 'onOpenChange'
  | 'label'
  | 'children'
  | 'dismissible'
  | 'contentScrolls'
  | 'surface'
  | 'size'
> & { sheetRef: SheetRef };
function HostedSheetContent(
  props: Pick<
    BottomSheetProps,
    | 'onOpenChange'
    | 'label'
    | 'children'
    | 'dismissible'
    | 'contentScrolls'
    | 'surface'
  >,
): React.JSX.Element {
  return (
    <RNHostView modifiers={[fillMaxHeight()]}>
      <BottomSheetContent
        label={props.label}
        onOpenChange={props.onOpenChange}
        dismissible={props.dismissible}
        contentScrolls={props.contentScrolls}
        surface={props.surface}
      >
        {props.children}
      </BottomSheetContent>
    </RNHostView>
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
