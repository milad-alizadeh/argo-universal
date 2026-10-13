import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { keepOpen } from '../keep-open';
import { SheetBody } from './bottom-sheet-body.web';
import { useSwipeToClose } from './bottom-sheet-swipe.web';

type SurfaceProps = {
  open: boolean;
  onClosed?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  dismissible?: boolean;
  expandable?: boolean;
  initialSize?: 'compact' | 'expanded';
  footer?: React.ReactNode;
  label?: string;
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
  const card = useHiddenWhileClosing(isAccessible(props));
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
        ref={card}
        {...sheetContentProps(props, expanded)}
      >
        {props.title}
        <SheetBody
          label={props.label}
          expanded={expanded}
          onResize={resize}
          footer={props.footer}
        >
          {props.children}
        </SheetBody>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// Radix draws the dialog element around the card, out of reach of props.
function useHiddenWhileClosing(
  accessible: boolean,
): React.RefObject<View | null> {
  const card = useRef<View>(null);
  useLayoutEffect(() => {
    const dialog =
      card.current instanceof HTMLElement ? card.current.parentElement : null;
    dialog?.setAttribute('aria-hidden', String(!accessible));
  }, [accessible]);
  return card;
}

function sheetContentProps(
  props: Pick<
    SurfaceProps,
    'open' | 'onClosed' | 'dismissible' | 'onCloseAutoFocus'
  >,
  expanded: boolean,
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
    className: cn(
      'bottom-sheet max-h-[85dvh] rounded-t-surface bg-popover pb-8.5 shadow-card dark:border dark:border-border outline-none',
      expanded && 'h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]',
    ),
  };
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
