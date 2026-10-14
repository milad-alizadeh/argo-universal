import { cn } from '#lib/generic/utils';

// An action menu's web drawing, as the Session header's menus drew it before Menu took actions.
export const actionContentClassName = cn(
  'bg-card border-border min-w-32 overflow-hidden rounded-2xl web:shadow-card border p-1 shadow-overlay shadow-black/5',
  'web:animate-in web:fade-in-0 web:zoom-in-95 web:max-h-(--radix-dropdown-menu-content-available-height) web:overflow-y-auto web:origin-(--radix-dropdown-menu-content-transform-origin) web:z-50 web:cursor-default',
);

export const actionItemClassName = cn(
  'active:bg-muted group relative flex flex-row items-center gap-2 rounded-xl px-2 py-2 sm:py-1.5',
  'web:focus:bg-muted web:cursor-default web:outline-none web:data-disabled:pointer-events-none',
);

export const actionItemTextClassName = 'select-none text-foreground';
