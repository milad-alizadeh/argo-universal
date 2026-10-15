// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { font, foregroundStyle, imageScale } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { appleSymbol } from './apple-symbol';
import { type AppleSymbol, isCustomSymbol } from './custom-symbols';
import { iconSymbols } from './icon-names';
import { type IconRole, useIconPixels } from './icon-role';
import type { NativeSymbolProps } from './native-symbol-props';

const mutedStyle = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

/*
 * A list row's icon is a Label's, sized by the row's body text so it scales with Dynamic Type, as
 * stock iOS draws it. Image's `size` is a fixed point size, so it would not scale. A Label draws its
 * icon at the large image scale, so `imageScale('medium')` (SwiftUI's default) brings it back to
 * the body text's size.
 */
const textSizedRoles: Partial<Record<IconRole, ImageProps['modifiers']>> = {
  row: [font({ textStyle: 'body' }), imageScale('medium')],
};

function imageSource(
  sf: AppleSymbol,
): Pick<ImageProps, 'assetName' | 'systemName'> {
  return isCustomSymbol(sf) ? { assetName: sf } : { systemName: sf };
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
      {...imageSource(appleSymbol(iconSymbols[name], filled))}
      size={pixels}
      modifiers={symbolModifiers(role, muted)}
    />
  );
}
