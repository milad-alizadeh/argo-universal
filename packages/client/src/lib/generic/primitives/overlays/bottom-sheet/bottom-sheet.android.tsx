import {
  ModalBottomSheet,
  type ModalBottomSheetRef,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePresentationClosed } from '../../native/native-only-animated-view/native-only-animated-view';
import { useSheetColors } from './bottom-sheet-colors.android';
import {
  HostedSheetContent,
  SheetHost,
  type HostedSheetProps,
} from './bottom-sheet-hosted.android';
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
  return (
    <SheetHost>
      <SheetModal {...presentation} />
    </SheetHost>
  );
}

function SheetModal(presentation: SheetProps): React.JSX.Element {
  const { sheetRef, ...props } = presentation;
  const sheet = useSheetColors(props.surface);
  return (
    <ModalBottomSheet
      {...sheet}
      ref={sheetRef}
      onDismissRequest={() => props.onOpenChange(false)}
      {...dismissalProps(props.dismissible !== false)}
    >
      <HostedSheetContent {...props} />
    </ModalBottomSheet>
  );
}

function dismissalProps(
  dismissible: boolean,
): Pick<
  React.ComponentProps<typeof ModalBottomSheet>,
  'sheetGesturesEnabled' | 'properties'
> {
  return {
    sheetGesturesEnabled: dismissible,
    properties: {
      shouldDismissOnBackPress: dismissible,
      shouldDismissOnClickOutside: dismissible,
    },
  };
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

type SheetProps = HostedSheetProps & { sheetRef: SheetRef };
