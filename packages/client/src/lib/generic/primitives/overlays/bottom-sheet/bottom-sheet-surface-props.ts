import type * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import type { BottomSheetProps } from './bottom-sheet-props';
import { keepOpen } from './keep-open';

export type SurfaceProps = {
  open: boolean;
  onClosed?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  dismissible?: boolean;
  expandable?: boolean;
  initialSize?: BottomSheetProps['initialSize'];
  footer?: React.ReactNode;
  label?: string;
  variant?: 'form';
  // A hidden title for a sheet whose content has none of its own.
  title?: React.ReactNode;
  /*
   * A dialog leaves the accessibility tree as soon as it closes, as the centred one does.
   * A plain sheet stays in it until it has slid away.
   */
  hiddenWhileClosing?: boolean;
  children: React.ReactNode;
};

export function overlayProps(open: boolean): React.ComponentProps<
  typeof DialogPrimitive.Overlay
> & {
  'data-state': string;
} {
  return {
    'data-state': open ? 'open' : 'closed',
    className: 'bottom-sheet-overlay absolute inset-0 bg-scrim/20',
  };
}

type ContentSource = Pick<
  SurfaceProps,
  'open' | 'onClosed' | 'dismissible' | 'onCloseAutoFocus' | 'variant'
>;

type ContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  'data-state': string;
  'aria-describedby': undefined;
};

export function sheetContentProps(
  props: ContentSource,
  expanded: boolean,
  anchored: boolean,
): ContentProps {
  return {
    'data-state': props.open ? 'open' : 'closed',
    'aria-describedby': undefined,
    onCloseAutoFocus: closeAutoFocus(props),
    onEscapeKeyDown: keepOpen(props.dismissible),
    onInteractOutside: keepOpen(props.dismissible),
    className: sheetClass(props.variant, expanded, anchored),
  };
}

function closeAutoFocus(props: ContentSource): (event: Event) => void {
  return (event) => {
    props.onCloseAutoFocus?.(event);
    props.onClosed?.();
  };
}

function sheetClass(
  variant: SurfaceProps['variant'],
  expanded: boolean,
  anchored: boolean,
): string {
  return cn(
    'bottom-sheet max-h-[85dvh] rounded-t-surface bg-card pb-8.5 shadow-card dark:border dark:border-border outline-none',
    formClass(variant),
    anchored && 'bottom-sheet-anchored',
    expanded && 'h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]',
  );
}

function formClass(variant: SurfaceProps['variant']): string | undefined {
  return variant === 'form' ? 'bottom-sheet-form w-full touch-none' : undefined;
}
