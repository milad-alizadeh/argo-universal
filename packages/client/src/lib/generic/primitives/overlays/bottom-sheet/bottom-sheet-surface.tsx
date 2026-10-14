import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import {
  SurfaceContent,
  type SheetResize,
} from './bottom-sheet-surface-content';
import {
  overlayProps,
  sheetContentProps,
  type SurfaceProps,
} from './bottom-sheet-surface-props';
import { useSwipeToClose } from './bottom-sheet-swipe';
import { sheetDialog, useSheetAnchor } from './use-sheet-anchor';

/*
 * The web sheet inside a dialog root: the dimmed backdrop, then the card rising from the bottom edge.
 * Both stay direct children of the portal, so each one finishes its exit animation before it unmounts.
 */
export function BottomSheetSurface(props: SurfaceProps): React.JSX.Element {
  const { anchored, expanded, resize, ref } = useSheetSurface(props);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay {...overlayProps(props.open)} />
      <DialogPrimitive.Content
        ref={ref}
        {...sheetContentProps(props, expanded, anchored)}
      >
        {props.title}
        <SurfaceContent {...props} expanded={expanded} resize={resize} />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

type SheetSurface = {
  anchored: boolean;
  expanded: boolean;
  resize: SheetResize;
  ref: React.RefCallback<View>;
};

function useSheetSurface(props: SurfaceProps): SheetSurface {
  const [expanded, setExpanded] = useState(props.initialSize === 'expanded');
  const { anchor, card, ref } = useSheetAnchor(props.variant);
  useHiddenWhileClosing(card, isAccessible(props));
  const close = useCloseSheet(props.dismissible);
  const resize = props.expandable ? setExpanded : undefined;
  useSwipeToClose(card, close, resize);

  return { anchored: !!anchor, expanded, resize, ref };
}

// Radix draws the dialog element around the card, out of reach of props.
function useHiddenWhileClosing(
  card: React.RefObject<View | null>,
  accessible: boolean,
): void {
  useLayoutEffect(() => {
    const dialog = sheetDialog(card.current);
    dialog?.setAttribute('aria-hidden', String(!accessible));
  }, [card, accessible]);
}

function useCloseSheet(dismissible: boolean | undefined): () => void {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  return useCallback(
    () => closeSheet(dismissible, onOpenChange),
    [onOpenChange, dismissible],
  );
}

function closeSheet(
  dismissible: boolean | undefined,
  onOpenChange: (open: boolean) => void,
): void {
  if (dismissible !== false) onOpenChange(false);
}

function isAccessible(
  props: Pick<SurfaceProps, 'open' | 'hiddenWhileClosing'>,
): boolean {
  return props.open || !props.hiddenWhileClosing;
}
