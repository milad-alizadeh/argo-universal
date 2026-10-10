import {
  Host,
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RNHostView,
} from '@expo/ui/jetpack-compose';
import { fillMaxHeight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useResolveClassNames } from 'uniwind';
import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import type { BottomSheetProps } from './bottom-sheet.types';
import { usePresentationClosed } from './native-only-animated-view';

type SheetRef = React.RefObject<ModalBottomSheetRef | null>;

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const { mounted, sheetRef } = useSheetDismissal(props.open, props.onClosed);
  return (
    <BottomSheetRoot {...props}>
      <BottomSheetTrigger trigger={props.trigger} />
      {mounted && <SheetPresentation {...props} sheetRef={sheetRef} />}
    </BottomSheetRoot>
  );
}

function SheetPresentation(presentation: SheetProps): React.JSX.Element {
  const { sheetRef, ...props } = presentation;
  const sheet = useSheetColors();
  return (
    <SheetHost>
      <ModalBottomSheet
        {...sheet}
        ref={sheetRef}
        onDismissRequest={() => props.onOpenChange(false)}
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

function useSheetColors(): Pick<
  React.ComponentProps<typeof ModalBottomSheet>,
  'containerColor' | 'scrimColor'
> {
  const background = useResolveClassNames('bg-popover');
  const scrim = useResolveClassNames('bg-black/20');
  return {
    containerColor: background.backgroundColor,
    scrimColor: scrim.backgroundColor,
  };
}

type SheetProps = Pick<
  BottomSheetProps,
  'onOpenChange' | 'label' | 'children'
> & { sheetRef: SheetRef };
function HostedSheetContent(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'label' | 'children'>,
): React.JSX.Element {
  return (
    <RNHostView modifiers={[fillMaxHeight()]}>
      <BottomSheetContent {...props} />
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
