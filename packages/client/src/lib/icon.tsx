import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  Platform,
} from 'react-native';
import { useCSSVariable, withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';
import { type IconName, iconSymbols } from './icon-names';
import type { NativeSymbol } from './native-symbol';
import { SymbolGlyph } from './symbol-glyph';

// sm for chevrons, carets and check marks; md for every other icon; lg for phone shell controls and the desktop rail.
export const iconSizeClasses = {
  sm: 'size-icon-sm',
  mark: 'size-icon-mark',
  md: 'size-icon-md',
  lg: 'size-icon-lg',
} as const;

export type IconSize = keyof typeof iconSizeClasses;

// Symbols and ActivityIndicator take a number, so this is the one place a variant becomes pixels.
export function useIconPixels(size: IconSize): number {
  const pixels = useCSSVariable(`--spacing-icon-${size}`);
  return typeof pixels === 'number'
    ? pixels
    : Number.parseFloat(String(pixels));
}

// Material Symbols draw chevrons and checks much smaller in their box than SF Symbols do, so Android draws them a size up.
function glyphSize(size: IconSize): IconSize {
  return Platform.OS === 'android' && size === 'sm' ? 'md' : size;
}

export interface IconProps {
  name: IconName;
  size?: IconSize;
  // Draws the SF Symbol's filled variant where it has one; Material Symbols stay outlined.
  filled?: boolean;
  className?: string;
  testID?: string;
}

const TintedSymbol = withUniwind(SymbolGlyph, {
  tintColor: {
    fromClassName: 'className',
    styleProperty: 'color',
  },
});

export function Icon({
  name,
  size = 'md',
  filled = false,
  className,
  testID = `icon-${name}`,
}: IconProps): React.JSX.Element {
  const textClass = useContext(TextClassContext);
  const symbol: NativeSymbol = iconSymbols[name];
  const colorClassName = cn('text-foreground', textClass, className);
  return (
    <TintedSymbol
      className={colorClassName}
      colorClassName={colorClassName}
      sf={(filled && symbol.sfFilled) || symbol.sf}
      material={symbol.material}
      pixels={useIconPixels(glyphSize(size))}
      testID={testID}
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
