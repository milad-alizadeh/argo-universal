import { cn } from '#lib/generic/utils';

const triggerClassName =
  'border-border dark:bg-border/30 dark:active:bg-pressed bg-card flex h-10 flex-row items-center justify-between gap-2 rounded-control border px-3 py-2 shadow-control sm:h-9 web:focus-visible:border-focus web:focus-visible:ring-focus/50 web:aria-invalid:ring-danger/20 web:dark:aria-invalid:ring-danger/40 web:aria-invalid:border-danger web:dark:hover:bg-hover web:w-fit web:whitespace-nowrap web:type-body web:outline-none web:transition web:focus-visible:ring-3 web:disabled:cursor-not-allowed web:**:pointer-events-none';

const plainTriggerClassName =
  'flex h-8 flex-row items-center gap-1.5 rounded-control pl-2 web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:w-fit web:whitespace-nowrap web:outline-none web:disabled:cursor-not-allowed';

const itemClassName =
  'active:bg-pressed group relative flex w-full flex-row items-center gap-2 rounded-xl py-2 pl-2 pr-8 sm:py-1.5 web:focus:bg-hover web:*:last:flex web:*:last:items-center web:*:last:gap-2 web:cursor-default web:outline-none web:data-disabled:pointer-events-none web:**:pointer-events-none';

type TriggerStyle = {
  className?: string;
  disabled?: boolean | null;
  size?: 'default' | 'sm';
  variant?: SelectVariant;
};

export type SelectVariant = 'default' | 'plain';

type ContentStyle = {
  className?: string;
  side?: 'top' | 'bottom';
  position?: 'popper' | 'item-aligned';
};

const disabledClassName = 'opacity-50';

function triggerFrameClassName({
  size,
  variant,
}: Pick<TriggerStyle, 'size' | 'variant'>): string {
  if (variant === 'plain') return plainTriggerClassName;

  return cn(triggerClassName, size === 'sm' && 'h-8 py-2 sm:py-1.5');
}

export function selectTriggerClassName(style: TriggerStyle): string {
  return cn(
    triggerFrameClassName(style),
    style.disabled && disabledClassName,
    style.className,
  );
}

export function selectItemClassName({
  className,
  disabled,
}: Pick<TriggerStyle, 'className' | 'disabled'>): string {
  return cn(itemClassName, disabled && disabledClassName, className);
}

function slideClassName(side: ContentStyle['side']): string {
  return cn(
    side === 'bottom' && 'web:slide-in-from-top-2',
    side === 'top' && 'web:slide-in-from-bottom-2',
  );
}

function translateClassName(side: ContentStyle['side']): string {
  return cn(
    side === 'bottom' && 'web:translate-y-1',
    side === 'top' && 'web:-translate-y-1',
  );
}

function popperClassName({ position, side }: ContentStyle): string | undefined {
  if (position !== 'popper') return;

  return translateClassName(side);
}

export function selectContentClassName(props: ContentStyle): string {
  return cn(
    'bg-card border-border relative z-50 min-w-32 rounded-2xl web:shadow-card border shadow-raised',
    'web:animate-in web:fade-in-0 web:zoom-in-95 web:origin-(--radix-select-content-transform-origin) web:max-h-52 web:overflow-y-auto web:overflow-x-hidden',
    slideClassName(props.side),
    popperClassName(props),
    props.className,
  );
}

export function selectViewportClassName(
  position: ContentStyle['position'],
): string {
  return cn(
    'p-1',
    position === 'popper' &&
      'w-full web:h-(--radix-select-trigger-height) web:min-w-(--radix-select-trigger-width)',
  );
}
