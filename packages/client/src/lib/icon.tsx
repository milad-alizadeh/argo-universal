import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  StyleSheet,
} from 'react-native';
import { useCSSVariable, withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';

// sm for chevrons, carets and check marks; md for every other icon; lg for phone shell controls and the desktop rail.
export const iconSizeClasses = {
  sm: 'size-icon-sm',
  mark: 'size-icon-mark',
  md: 'size-icon-md',
  lg: 'size-icon-lg',
} as const;

export type IconSize = keyof typeof iconSizeClasses;

// Phosphor and ActivityIndicator take a number, so this is the one place a variant becomes pixels.
export function useIconPixels(size: IconSize): number {
  const pixels = useCSSVariable(`--spacing-icon-${size}`);
  return typeof pixels === 'number'
    ? pixels
    : Number.parseFloat(String(pixels));
}

export type IconProps = Omit<PhosphorIconProps, 'size'> & {
  as: PhosphorIcon;
  size?: IconSize;
  className?: string;
};

function IconComponent({
  as: Component,
  pixels,
  style,
  ...props
}: Omit<IconProps, 'size'> & { pixels: number }): React.JSX.Element {
  return (
    <Component
      {...props}
      size={pixels}
      style={{ ...StyleSheet.flatten(style), width: pixels, height: pixels }}
    />
  );
}

const StyledIcon = withUniwind(IconComponent, {
  color: {
    fromClassName: 'className',
    styleProperty: 'color',
  },
});

export function Icon({
  className,
  size = 'md',
  weight = 'regular',
  ...props
}: IconProps): React.JSX.Element {
  const textClass = useContext(TextClassContext);
  const pixels = useIconPixels(size);
  return (
    <StyledIcon
      className={cn('text-foreground', textClass, className)}
      pixels={pixels}
      weight={weight}
      {...props}
    />
  );
}

export function IconSpinner({
  size = 'md',
  ...props
}: Omit<ActivityIndicatorProps, 'size'> & {
  size?: IconSize;
}): React.JSX.Element {
  const pixels = useIconPixels(size);
  return <ActivityIndicator {...props} size={pixels} />;
}
