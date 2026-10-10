import {
  Host,
  ModalBottomSheet,
  type ModalBottomSheetRef,
  RNHostView,
} from '@expo/ui/jetpack-compose';
import { fillMaxHeight } from '@expo/ui/jetpack-compose/modifiers';
import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useResolveClassNames } from 'uniwind';
import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet.types';
import { usePresentationClosed } from './native-only-animated-view';

export function BottomSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: BottomSheetProps): React.JSX.Element {
  const { mounted, sheetRef } = useSheetDismissal(open, onClosed);
  const background = useResolveClassNames('bg-popover');
  const scrim = useResolveClassNames('bg-black/20');
  return (
    <DialogPrimitive.Root style={style} open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild disabled={!!trigger.props.disabled}>
        {trigger}
      </DialogPrimitive.Trigger>
      {mounted && (
        <Host style={{ position: 'absolute' }} pointerEvents="none">
          <ModalBottomSheet
            ref={sheetRef}
            onDismissRequest={() => onOpenChange(false)}
            containerColor={background.backgroundColor}
            scrimColor={scrim.backgroundColor}
          >
            <RNHostView modifiers={[fillMaxHeight()]}>
              <BottomSheetContent label={label} onOpenChange={onOpenChange}>
                {children}
              </BottomSheetContent>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      )}
    </DialogPrimitive.Root>
  );
}

function useSheetDismissal(open: boolean, onClosed?: () => void) {
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  const [mounted, setMounted] = useState(open);
  const closing = useRef(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!mounted || !sheet) return;
    if (open) {
      if (closing.current) void sheet.partialExpand();
      closing.current = false;
      return;
    }
    let cancelled = false;
    closing.current = true;
    void sheet.hide().then(() => {
      if (!cancelled) setMounted(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, mounted]);
  usePresentationClosed(mounted, onClosed);
  return { mounted, sheetRef };
}
