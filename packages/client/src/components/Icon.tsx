import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from 'phosphor-react-native';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  StyleSheet,
} from 'react-native';
import { useResolveClassNames, withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';

// sm for chevrons, carets and check marks; md for every other icon; lg for phone shell controls and the desktop rail.
export const iconSizeClasses = {
  sm: 'size-icon-sm',
  md: 'size-icon-md',
  lg: 'size-icon-lg',
} as const;

export type IconSize = keyof typeof iconSizeClasses;

// Phosphor and ActivityIndicator take a number, so this is the one place a variant becomes pixels.
function useIconPixels(size: IconSize) {
  const { width } = useResolveClassNames(iconSizeClasses[size]);
  return typeof width === 'number' ? width : Number.parseFloat(String(width));
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
}: Omit<IconProps, 'size'> & { pixels: number }) {
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
}: IconProps) {
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
}: Omit<ActivityIndicatorProps, 'size'> & { size?: IconSize }) {
  const pixels = useIconPixels(size);
  return <ActivityIndicator {...props} size={pixels} />;
}
