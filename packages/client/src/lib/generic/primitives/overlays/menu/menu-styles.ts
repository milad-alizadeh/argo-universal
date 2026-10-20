import {
  menuInsetClassName,
  menuRowClassName,
  menuRowsClassName,
  menuSurfaceClassName,
} from '#lib/generic/menu-surface';
import { cn } from '#lib/generic/utils';

export { menuRowsClassName };

// A menu's card: Paper's Configure popover, its rows 2px apart.
export const menuContentClassName = cn(
  menuSurfaceClassName,
  menuInsetClassName,
  menuRowsClassName,
  'overflow-hidden',
);

// An action menu's web drawing, as the Session header's menus drew it before Menu took actions.
export const actionContentClassName = cn(
  menuContentClassName,
  'min-w-65 shadow-raised web:shadow-card',
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-dropdown-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-dropdown-menu-content-transform-origin) web:z-50 web:cursor-default',
);

export const actionItemClassName = cn(
  menuRowClassName,
  'active:bg-pressed group relative',
  'web:focus:bg-hover web:cursor-default web:outline-none web:data-disabled:pointer-events-none web:data-disabled:opacity-50',
);

export const actionItemTextClassName = 'select-none text-foreground';

// A choice row's shape, shared by the radio rows and the loading row that stands in for them.
export const choiceRowClassName = menuRowClassName;

export function menuTextClass(tone?: 'danger'): string {
  return tone === 'danger' ? 'text-danger' : actionItemTextClassName;
}

export function menuRowClass(tone?: 'danger'): string {
  return cn(
    actionItemClassName,
    tone === 'danger' && 'web:focus:bg-danger/10 active:bg-danger/10',
  );
}
