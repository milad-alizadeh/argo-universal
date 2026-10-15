// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { foregroundStyle, frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { appleSymbol } from './apple-symbol';
import { type AppleSymbol, isCustomSymbol } from './custom-symbols';
import { iconSymbols } from './icon-names';
import { useIconPixels } from './icon-role';
import type { NativeSymbolProps } from './native-symbol-props';

const mutedStyle = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

function imageSource(
  sf: AppleSymbol,
): Pick<ImageProps, 'assetName' | 'systemName'> {
  return isCustomSymbol(sf) ? { assetName: sf } : { systemName: sf };
}

/*
 * An Argo icon inside a SwiftUI tree, which cannot hold a React Native view. It sits in a square
 * slot of its role's size, as Paper's row icon and Android's IconSlot do: an unframed symbol is
 * only as wide as its glyph, so each row's title, and the Form separator that follows the title,
 * started at a different x in the Settings capture.
 */
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
      modifiers={symbolModifiers(pixels, muted)}
    />
  );
}

function symbolModifiers(
  pixels: number,
  muted: boolean | undefined,
): NonNullable<ImageProps['modifiers']> {
  const slot = frame({ width: pixels, height: pixels });

  return muted === true ? [slot, mutedStyle] : [slot];
}
