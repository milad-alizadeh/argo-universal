import type * as React from 'react';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';

interface ChevronProps {
  menuLabel: string;
  primary?: boolean;
  disabled?: boolean;
  height?: number;
}

export const chevronSizes = {
  wide: 'h-8 w-7 px-0 sm:h-8',
  phone: 'h-11 w-11 rounded-lg px-0 sm:h-11',
};

const chevronIcon = {
  icon: 'chevron-down',
  iconRole: 'secondary',
  size: 'md',
} as const;

const chevronTones = {
  primary: { variant: 'filled', iconClassName: 'text-primary-foreground' },
  plain: { variant: 'ghost', iconClassName: 'text-muted-foreground' },
} as const;

// A Button element, so the menu's asChild trigger can pass its press handlers to it.
export function chevron(
  props: ChevronProps,
  className: string,
): React.JSX.Element {
  return (
    <IconButton
      {...chevronIcon}
      {...(props.primary ? chevronTones.primary : chevronTones.plain)}
      accessibilityLabel={props.menuLabel}
      disabled={props.disabled}
      className={className}
      style={props.height === undefined ? undefined : { height: props.height }}
    />
  );
}
