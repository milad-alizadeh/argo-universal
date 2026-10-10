import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useCSSVariable, useResolveClassNames, withUniwind } from 'uniwind';
import { TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { type IconName, iconSymbols } from './icon-names';
import type { NativeSymbol } from './native-symbol';
import { sfFilledPaths, type SymbolPath } from './sf-filled-paths';
import { SymbolGlyph } from './symbol-glyph';
import { useSymbolImageRenderer } from './symbol-images';

// Symbols and ActivityIndicator take a number, so this is the one place a variant becomes pixels.
export function useIconPixels(size: 'sm' | 'md' = 'md'): number {
  const pixels = useCSSVariable(`--spacing-icon-${size}`);
  return typeof pixels === 'number'
    ? pixels
    : Number.parseFloat(String(pixels));
}

// Android and the browser draw Material Symbols; iOS and the desktop app on macOS draw SF Symbols.
function useDrawsMaterial(): boolean {
  const render = useSymbolImageRenderer();
  return Platform.OS === 'android' || (Platform.OS === 'web' && !render);
}

export interface IconProps {
  name: IconName;
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
  filled = false,
  className,
  testID = `icon-${name}`,
}: IconProps): React.JSX.Element {
  const textClass = useContext(TextClassContext);
  const symbol: NativeSymbol = iconSymbols[name];
  const colorClassName = cn('text-foreground', textClass, className);
  const material = useDrawsMaterial();
  const pixels = useIconPixels(name.startsWith('chevron-') ? 'sm' : 'md');
  const color = useResolveClassNames(colorClassName).color;
  const filledPath =
    filled && material && symbol.sfFilled
      ? sfFilledPaths[symbol.sfFilled]
      : undefined;
  if (filledPath)
    return (
      <FilledPath
        path={filledPath}
        pixels={pixels}
        color={typeof color === 'string' ? color : undefined}
        testID={testID}
      />
    );
  return (
    <TintedSymbol
      className={colorClassName}
      colorClassName={colorClassName}
      sf={(filled && symbol.sfFilled) || symbol.sf}
      material={symbol.material}
      pixels={pixels}
      testID={testID}
    />
  );
}

// Material Symbols have no filled form, so a filled icon draws the SF symbol's outline there.
function FilledPath({
  path,
  pixels,
  color,
  testID,
}: {
  path: SymbolPath;
  pixels: number;
  color: string | undefined;
  testID: string;
}): React.JSX.Element {
  return (
    <Svg
      width={pixels}
      height={pixels}
      viewBox={`0 0 ${path.width} ${path.height}`}
      testID={testID}
    >
      <Path d={path.d} fill={color ?? 'currentColor'} />
    </Svg>
  );
}

export function IconSpinner(
  props: Omit<ActivityIndicatorProps, 'size'>,
): React.JSX.Element {
  const pixels = useIconPixels();
  return <ActivityIndicator {...props} size={pixels} />;
}
