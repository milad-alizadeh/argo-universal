import { Platform } from 'react-native';
import { cn } from '#lib/generic/utils';

const triggerClassName = cn(
  'border-input dark:bg-input/30 dark:active:bg-input/50 bg-background flex h-10 flex-row items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-sm shadow-black/5 sm:h-9',
  Platform.select({
    web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-input/50 w-fit whitespace-nowrap text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
  }),
);
const itemClassName = cn(
  'active:bg-accent group relative flex w-full flex-row items-center gap-2 rounded-sm py-2 pl-2 pr-8 sm:py-1.5',
  Platform.select({
    web: 'focus:bg-accent focus:text-accent-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 cursor-default outline-none data-[disabled]:pointer-events-none [&_svg]:pointer-events-none',
  }),
);

type TriggerStyle = {
  className?: string;
  disabled?: boolean | null;
  size?: 'default' | 'sm';
};
type ContentStyle = {
  className?: string;
  side?: 'top' | 'bottom';
  position?: 'popper' | 'item-aligned';
};

export function selectTriggerClassName({
  className,
  disabled,
  size,
}: TriggerStyle): string {
  return cn(
    triggerClassName,
    disabled && 'opacity-50',
    size === 'sm' && 'h-8 py-2 sm:py-1.5',
    className,
  );
}

export function selectItemClassName({
  className,
  disabled,
}: Pick<TriggerStyle, 'className' | 'disabled'>): string {
  return cn(itemClassName, disabled && 'opacity-50', className);
}

function slideClassName(side: ContentStyle['side']): string {
  return cn(
    side === 'bottom' && 'slide-in-from-top-2',
    side === 'top' && 'slide-in-from-bottom-2',
  );
}

function translateClassName(side: ContentStyle['side']): string {
  return cn(
    side === 'bottom' && 'translate-y-1',
    side === 'top' && '-translate-y-1',
  );
}

function popperClassName({ position, side }: ContentStyle): string | undefined {
  if (position !== 'popper') return;
  return Platform.select({ web: translateClassName(side) });
}

export function selectContentClassName(props: ContentStyle): string {
  return cn(
    'bg-popover border-border relative z-50 min-w-[8rem] rounded-md border shadow-md shadow-black/5',
    Platform.select({
      web: cn(
        'animate-in fade-in-0 zoom-in-95 origin-(--radix-select-content-transform-origin) max-h-52 overflow-y-auto overflow-x-hidden',
        slideClassName(props.side),
      ),
      native: 'p-1',
    }),
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
      cn(
        'w-full',
        Platform.select({
          web: 'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]',
        }),
      ),
  );
}
