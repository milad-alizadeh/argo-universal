import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/buttons/icon-button';
import type { SplitMenuProps } from './split-button-props';

// `className` is ButtonGroup's, joining the chevron to the button beside it.
type ChevronProps = Pick<
  SplitMenuProps,
  'menuLabel' | 'primary' | 'disabled' | 'narrow' | 'size'
> & { height?: number; className?: string };

const chevronFits = {
  sm: {
    size: 'sm',
    iconRole: 'secondary',
    wide: 'h-8 w-7 px-0 sm:h-8',
    narrow: 'h-11 w-11 px-0 sm:h-11',
  },
  // The group dims as one, so the chevron does not dim a second time.
  xs: {
    size: 'xs',
    iconRole: 'control',
    wide: 'sm:w-6 opacity-100',
    narrow: 'opacity-100',
  },
} as const;

const chevronTones = {
  primary: { variant: 'filled', iconClassName: 'text-primary-foreground' },
  plain: { variant: 'ghost', iconClassName: 'text-muted-foreground' },
} as const;

// A Button element, so the menu's asChild trigger can pass its press handlers to it.
export function chevron(props: ChevronProps): React.JSX.Element {
  const fit = chevronFits[props.size ?? 'sm'];

  return (
    <IconButton
      icon="chevron-down"
      size={fit.size}
      iconRole={fit.iconRole}
      {...chevronTone(props)}
      accessibilityLabel={props.menuLabel}
      disabled={props.disabled}
      className={chevronClassName(props, fit)}
      style={heightStyle(props.height)}
    />
  );
}

// The button's corners, not IconButton's; the group then squares the joined side.
function chevronClassName(
  props: ChevronProps,
  fit: (typeof chevronFits)[keyof typeof chevronFits],
): string {
  return cn(
    'web:rounded-md',
    props.narrow ? fit.narrow : fit.wide,
    props.className,
  );
}

function chevronTone(
  props: ChevronProps,
): (typeof chevronTones)[keyof typeof chevronTones] {
  return props.primary ? chevronTones.primary : chevronTones.plain;
}

function heightStyle(height?: number): { height: number } | undefined {
  return height === undefined ? undefined : { height };
}
