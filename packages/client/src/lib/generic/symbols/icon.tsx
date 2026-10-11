import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  type ViewStyle,
} from 'react-native';
import { withUniwind } from 'uniwind';
import { TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { type IconName, iconSymbols } from './icon-names';
import type { NativeSymbol } from './native-symbol';
import { SymbolGlyph } from './symbol-glyph';

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type IconSize = keyof typeof iconSizes;

export function iconPixels(size: IconSize): number {
  return iconSizes[size];
}

export function iconSizeStyle(
  size: IconSize,
): Pick<ViewStyle, 'width' | 'height'> {
  const pixels = iconPixels(size);
  return { width: pixels, height: pixels };
}

export interface IconProps {
  name: IconName;
  size?: IconSize;
  // Selects the platform's filled variant where the icon has one.
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
  size = 'sm',
  filled = false,
  className,
  testID = `icon-${name}`,
}: IconProps): React.JSX.Element {
  const textClass = useContext(TextClassContext);
  const symbol: NativeSymbol = iconSymbols[name];
  const colorClassName = cn('text-foreground', textClass, className);
  const pixels = iconPixels(size);
  const sf = (filled && symbol.sfFilled) || symbol.sf;
  return (
    <TintedSymbol
      className={colorClassName}
      colorClassName={colorClassName}
      sf={sf}
      material={symbol.material}
      filled={sf !== symbol.sf || sf.endsWith('.fill')}
      pixels={pixels}
      testID={testID}
    />
  );
}

export function IconSpinner({
  size = 'sm',
  ...props
}: Omit<ActivityIndicatorProps, 'size'> & {
  size?: IconSize;
}): React.JSX.Element {
  const pixels = iconPixels(size);
  return <ActivityIndicator {...props} size={pixels} />;
}
