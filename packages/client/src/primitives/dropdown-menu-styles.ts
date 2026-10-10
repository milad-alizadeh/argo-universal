import {
  Platform,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { cn } from '#lib/utils';
import { disabledMenuItemClassName, menuItemClassName } from './menu-styles';

const itemClassName =
  'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5';
type ItemStyle = {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  disabled?: boolean | null;
};
const destructiveItemClassName = cn(
  'active:bg-destructive/10 dark:active:bg-destructive/20',
  Platform.select({
    web: 'focus:bg-destructive/10 dark:focus:bg-destructive/20',
  }),
);

function itemLayout({ className, inset, disabled }: ItemStyle): string {
  return cn(disabled && disabledMenuItemClassName, inset && 'pl-8', className);
}

export function dropdownItemClassName(props: ItemStyle): string {
  return cn(
    itemClassName,
    Platform.select({ web: menuItemClassName }),
    props.variant === 'destructive' && destructiveItemClassName,
    itemLayout(props),
  );
}

export function dropdownItemTextClassName(
  variant: ItemStyle['variant'],
): string {
  return cn(
    'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
    variant === 'destructive' &&
      'text-destructive group-active:text-destructive',
  );
}

const contentClassName =
  'bg-popover border-border min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5';
const contentWebClassName =
  'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default';

function contentSlideClassName(side?: 'top' | 'bottom'): string {
  return cn(
    contentWebClassName,
    side === 'bottom' && 'slide-in-from-top-2',
    side === 'top' && 'slide-in-from-bottom-2',
  );
}

export function dropdownContentClassName(props: {
  className?: string;
  side?: 'top' | 'bottom';
}): string {
  return cn(
    contentClassName,
    Platform.select({ web: contentSlideClassName(props.side) }),
    props.className,
  );
}

export function dropdownOverlayStyle(
  overlayStyle?: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  const native = overlayStyle
    ? StyleSheet.flatten([StyleSheet.absoluteFill, overlayStyle])
    : StyleSheet.absoluteFill;
  return Platform.select({ web: overlayStyle, native });
}

const subTriggerClassName = cn(
  'active:bg-accent group flex flex-row items-center justify-between rounded-sm px-2 py-2 sm:py-1.5',
  Platform.select({
    web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
  }),
);

export function dropdownSubTriggerClassName(props: {
  className?: string;
  inset?: boolean;
  open: boolean;
}): string {
  return cn(
    subTriggerClassName,
    props.className,
    props.open && 'bg-accent',
    props.inset && 'pl-8',
  );
}

export const dropdownSubContentClassName = cn(
  'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
  Platform.select({
    web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
  }),
);
