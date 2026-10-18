import { cn } from '#lib/generic/utils';

// Rows keep a gap, as Android's grouped rows do, so hovered, pressed and checked tiles never touch.
export const menuRowsClassName = 'gap-0.5';

// An action menu's web drawing, as the Session header's menus drew it before Menu took actions.
export const actionContentClassName = cn(
  'bg-card dark:border-border min-w-65 overflow-hidden rounded-2xl web:shadow-card dark:border px-1 py-2 shadow-raised',
  menuRowsClassName,
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-dropdown-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-dropdown-menu-content-transform-origin) web:z-50 web:cursor-default',
);

export const actionItemClassName = cn(
  'active:bg-pressed group relative flex flex-row items-center gap-2 rounded-xl px-3 py-2',
  'web:focus:bg-hover web:cursor-default web:outline-none web:data-disabled:pointer-events-none web:data-disabled:opacity-50',
);

export const actionItemTextClassName = 'select-none text-foreground';

// A choice row's shape, shared by the radio rows and the loading row that stands in for them.
export const choiceRowClassName =
  'min-h-9 flex-row items-center gap-3 px-3 py-1.5';
