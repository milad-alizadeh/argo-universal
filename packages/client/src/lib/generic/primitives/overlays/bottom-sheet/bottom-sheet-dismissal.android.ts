import type { ModalBottomSheetRef } from '@expo/ui/jetpack-compose';
import { useEffect, useRef, useState } from 'react';
import { usePresentationClosed } from '#primitives/native/native-only-animated-view';

export type SheetRef = React.RefObject<ModalBottomSheetRef | null>;

// Whether the sheet is in the tree, kept there until its close animation ends.
interface SheetPresence {
  mounted: boolean;
  sheetRef: SheetRef;
}

export function useSheetDismissal(
  open: boolean,
  onClosed?: () => void,
): SheetPresence {
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
