import {
  Platform,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  disabledMenuItemClassName,
  menuItemClassName,
} from '../menu/menu-styles';

const itemClassName =
  'active:bg-accent group relative flex flex-row items-center gap-2 rounded-xl px-2 py-2 sm:py-1.5';

type ItemStyle = {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  disabled?: boolean | null;
};

const destructiveItemClassName =
  'active:bg-destructive/10 dark:active:bg-destructive/20 web:focus:bg-destructive/10 web:dark:focus:bg-destructive/20';

function itemLayout({ className, inset, disabled }: ItemStyle): string {
  return cn(disabled && disabledMenuItemClassName, inset && 'pl-8', className);
}

export function dropdownItemClassName(props: ItemStyle): string {
  return cn(
    itemClassName,
    menuItemClassName,
    props.variant === 'destructive' && destructiveItemClassName,
    itemLayout(props),
  );
}

export function dropdownItemTextClassName(
  variant: ItemStyle['variant'],
): string {
  return cn(
    'select-none text-popover-foreground group-active:text-popover-foreground',
    variant === 'destructive' &&
      'text-destructive group-active:text-destructive',
  );
}

const contentClassName =
  'bg-popover border-border min-w-[8rem] overflow-hidden rounded-2xl web:shadow-card border p-1 shadow-lg shadow-black/5';

const contentWebClassName =
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-dropdown-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-dropdown-menu-content-transform-origin) web:z-50 web:cursor-default';

function contentSlideClassName(side?: 'top' | 'bottom'): string {
  return cn(
    contentWebClassName,
    side === 'bottom' && 'web:slide-in-from-top-2',
    side === 'top' && 'web:slide-in-from-bottom-2',
  );
}

export function dropdownContentClassName(props: {
  className?: string;
  side?: 'top' | 'bottom';
}): string {
  return cn(
    contentClassName,
    contentSlideClassName(props.side),
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

const subTriggerClassName =
  'active:bg-accent group flex flex-row items-center justify-between rounded-xl px-2 py-2 sm:py-1.5 web:focus:bg-accent web:focus:text-accent-foreground web:cursor-default web:outline-none web:[&_svg]:pointer-events-none';

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

export const dropdownSubContentClassName =
  'bg-popover border-border overflow-hidden rounded-2xl web:shadow-card border p-1 shadow-lg shadow-black/5 web:animate-in web:data-[state=closed]:animate-out web:data-[state=closed]:fade-out-0 web:fade-in-0 web:data-[state=closed]:zoom-out-95 web:zoom-in-95 web:data-[side=bottom]:slide-in-from-top-2 web:data-[side=left]:slide-in-from-right-2 web:data-[side=right]:slide-in-from-left-2 web:data-[side=top]:slide-in-from-bottom-2 web:origin-(--radix-dropdown-menu-content-transform-origin) web:z-50 web:min-w-[8rem]';
