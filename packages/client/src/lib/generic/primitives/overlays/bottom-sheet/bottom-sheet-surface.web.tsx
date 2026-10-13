import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { keepOpen } from '../keep-open';
import { SheetBody } from './bottom-sheet-body.web';
import { useSwipeToClose } from './bottom-sheet-swipe.web';
import type { BottomSheetProps } from './bottom-sheet.types';
import { sheetDialog, useSheetAnchor } from './use-sheet-anchor.web';

type SurfaceProps = {
  open: boolean;
  onClosed?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  dismissible?: boolean;
  expandable?: boolean;
  initialSize?: BottomSheetProps['initialSize'];
  footer?: React.ReactNode;
  label?: string;
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
  const [expanded, setExpanded] = useState(props.initialSize === 'expanded');
  const { anchor, card, ref } = useSheetAnchor(props.size);
  useHiddenWhileClosing(card, isAccessible(props));
  const { onOpenChange } = DialogPrimitive.useRootContext();
  const close = useCallback(
    () => closeSheet(props.dismissible, onOpenChange),
    [onOpenChange, props.dismissible],
  );
  const resize = props.expandable ? setExpanded : undefined;
  useSwipeToClose(card, close, resize);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-state={props.open ? 'open' : 'closed'}
        className="bottom-sheet-overlay absolute inset-0 bg-black/20"
      />
      <DialogPrimitive.Content
        ref={ref}
        {...sheetContentProps(props, expanded, !!anchor)}
      >
        {props.title}
        <SurfaceBody form={props.size === 'form'}>
          <SheetBody
            label={props.label}
            expanded={expanded}
            onResize={resize}
            footer={props.footer}
          >
            {props.children}
          </SheetBody>
        </SurfaceBody>
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

function SurfaceBody(props: {
  form: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const { tallest, onLayout } = useTallestHeight();
  if (!props.form) return props.children;
  return (
    <View style={{ minHeight: tallest }} className="shrink" onLayout={onLayout}>
      {props.children}
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
  expanded: boolean,
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
    className: sheetClass(props.size, expanded, anchored),
  };
}

function sheetClass(
  size: SurfaceProps['size'],
  expanded: boolean,
  anchored: boolean,
): string {
  return cn(
    'bottom-sheet max-h-[85dvh] rounded-t-surface bg-popover pb-8.5 shadow-card dark:border dark:border-border outline-none',
    formClass(size),
    anchored && 'bottom-sheet-anchored',
    expanded && 'h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]',
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

function formClass(size: SurfaceProps['size']): string | undefined {
  return size === 'form' ? 'bottom-sheet-form w-full touch-none' : undefined;
}
