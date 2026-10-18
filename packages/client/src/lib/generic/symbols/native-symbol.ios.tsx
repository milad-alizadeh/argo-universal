// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { font, foregroundStyle, imageScale } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { isCustomSymbol } from './custom-symbols';
import { type DrawnSymbol, drawnSymbol } from './drawn-symbol';
import { iconSymbols } from './icon-names';
import { type IconRole, useIconPixels } from './icon-role';
import type { NativeSymbolProps } from './native-symbol-props';
import { tablerAsset } from './tabler-symbols';

const mutedStyle = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

/*
 * A list row's icon is a Label's, sized by the row's body text so it scales with Dynamic Type, as
 * stock iOS draws it. Image's `size` is a fixed point size, so it would not scale. A Label in a
 * Form draws its icon at the large image scale (24pt wide at body size on iOS 26), and so does a row.
 */
const textSizedRoles: Partial<Record<IconRole, ImageProps['modifiers']>> = {
  row: [font({ textStyle: 'body' }), imageScale('large')],
  // A row's disclosure chevron, drawn as a stock Form row's NavigationLink draws it.
  chevron: [
    font({ textStyle: 'body', weight: 'semibold' }),
    imageScale('small'),
  ],
};

// Argo's custom and Tabler symbols are in the app's asset catalog.
function imageSource(
  symbol: DrawnSymbol,
): Pick<ImageProps, 'assetName' | 'systemName'> {
  if (symbol.kind === 'tabler')
    return { assetName: tablerAsset(symbol.tabler) };

  return isCustomSymbol(symbol.sf)
    ? { assetName: symbol.sf }
    : { systemName: symbol.sf };
}

function symbolModifiers(
  role: IconRole,
  muted: boolean | undefined,
): ImageProps['modifiers'] {
  const modifiers = [
    ...(textSizedRoles[role] ?? []),
    muted === true && mutedStyle,
  ];

  return modifiers.filter(
    (modifier) => modifier !== undefined && modifier !== false,
  );
}

// An Argo icon inside a SwiftUI tree, which cannot hold a React Native view.
export function NativeSymbol({
  name,
  role,
  filled,
  muted,
}: NativeSymbolProps): React.JSX.Element {
  const pixels = useIconPixels(role);

  return (
    <Image
      {...imageSource(drawnSymbol(iconSymbols[name], filled))}
      size={pixels}
      modifiers={symbolModifiers(role, muted)}
    />
  );
}
