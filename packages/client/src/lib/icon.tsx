import type * as React from 'react';
import { useContext } from 'react';
import {
  ActivityIndicator,
  type ActivityIndicatorProps,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useCSSVariable, useResolveClassNames, withUniwind } from 'uniwind';
import { cn } from '#lib/utils';
import { TextClassContext } from '#primitives/text';
import { type IconName, iconSymbols } from './icon-names';
import type { NativeSymbol } from './native-symbol';
import { sfFilledPaths, type SymbolPath } from './sf-filled-paths';
import { SymbolGlyph } from './symbol-glyph';
import { useSymbolImageRenderer } from './symbol-images';

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

// Material Symbols draw chevrons and checks much smaller in their box than SF Symbols do, so they draw a size up.
function glyphSize(size: IconSize, material: boolean): IconSize {
  return material && size === 'sm' ? 'md' : size;
}

// Android and the browser draw Material Symbols; iOS and the desktop app on macOS draw SF Symbols.
function useDrawsMaterial(): boolean {
  const render = useSymbolImageRenderer();
  return Platform.OS === 'android' || (Platform.OS === 'web' && !render);
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
  const material = useDrawsMaterial();
  const pixels = useIconPixels(glyphSize(size, material));
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

export function IconSpinner({
  size = 'md',
  ...props
}: Omit<ActivityIndicatorProps, 'size'> & {
  size?: IconSize;
}): React.JSX.Element {
  const pixels = useIconPixels(size);
  return <ActivityIndicator {...props} size={pixels} />;
}
