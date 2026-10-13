import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '../../../utils';
import { keepOpen } from '../keep-open';
import { useSwipeToClose } from './bottom-sheet-swipe.web';
import { sheetDialog, useSheetAnchor } from './use-sheet-anchor.web';

type SurfaceProps = {
  open: boolean;
  onClosed?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  dismissible?: boolean;
  size?: 'form';
  // A hidden title for a sheet whose content has none of its own.
  title?: React.ReactNode;
  /*
   * A dialog leaves the accessibility tree as soon as it closes, as the centred one does.
   * A plain sheet stays in it until it has slid away.
   */
  hiddenWhileClosing?: boolean;
  children: React.ReactNode;
};

/*
 * The web sheet inside a dialog root: the dimmed backdrop, then the card rising from the bottom edge.
 * Both stay direct children of the portal, so each one finishes its exit animation before it unmounts.
 */
export function BottomSheetSurface(props: SurfaceProps): React.JSX.Element {
  const state = props.open ? 'open' : 'closed';
  const { anchor, card, ref } = useSheetAnchor(props.size);
  useHiddenWhileClosing(card, props.open || !props.hiddenWhileClosing);
  const { onOpenChange } = DialogPrimitive.useRootContext();
  const close = useCallback(() => {
    if (props.dismissible !== false) onOpenChange(false);
  }, [onOpenChange, props.dismissible]);
  useSwipeToClose(card, close);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-state={state}
        className="bottom-sheet-overlay absolute inset-0 bg-black/20"
      />
      <DialogPrimitive.Content
        ref={ref}
        {...sheetContentProps(props, !!anchor)}
      >
        {props.title}
        <SheetBody>{props.children}</SheetBody>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
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

function SheetBody({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { tallest, onLayout } = useTallestHeight();
  return (
    <View style={{ minHeight: tallest }} className="shrink" onLayout={onLayout}>
      <SheetGrip />
      <ScrollView>{children}</ScrollView>
    </View>
  );
}

function SheetGrip(): React.JSX.Element {
  return (
    <View className="items-center pt-1.5 pb-2">
      <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
    </View>
  );
}

function useTallestHeight(): {
  tallest: number;
  onLayout: React.ComponentProps<typeof View>['onLayout'];
} {
  const [tallest, setTallest] = useState(0);
  const onLayout: React.ComponentProps<typeof View>['onLayout'] = (event) => {
    const { height } = event.nativeEvent.layout;
    setTallest((previous) => Math.max(previous, height));
  };
  return { tallest, onLayout };
}

function sheetContentProps(
  props: Pick<
    SurfaceProps,
    'open' | 'onClosed' | 'dismissible' | 'onCloseAutoFocus' | 'size'
  >,
  anchored: boolean,
): React.ComponentProps<typeof DialogPrimitive.Content> & {
  'data-state': string;
  'aria-describedby': undefined;
} {
  return {
    'data-state': props.open ? 'open' : 'closed',
    'aria-describedby': undefined,
    onCloseAutoFocus: (event) => {
      props.onCloseAutoFocus?.(event);
      props.onClosed?.();
    },
    onEscapeKeyDown: keepOpen(props.dismissible),
    onInteractOutside: keepOpen(props.dismissible),
    className: sheetClass(props.size, anchored),
  };
}

function sheetClass(size: SurfaceProps['size'], anchored: boolean): string {
  return cn(
    'bottom-sheet touch-none max-h-[85vh] rounded-t-surface bg-popover pb-8.5 shadow-card dark:border dark:border-border outline-none',
    size === 'form' && 'bottom-sheet-form w-full',
    anchored && 'bottom-sheet-anchored',
  );
}
