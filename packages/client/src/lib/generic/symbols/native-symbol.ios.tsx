import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
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

// An Argo icon inside a SwiftUI tree, which cannot hold a React Native view.
export function NativeSymbol({
  name,
  role,
  filled,
  muted,
}: NativeSymbolProps): React.JSX.Element {
  return (
    <Image
      {...imageSource(appleSymbol(iconSymbols[name], filled))}
      size={useIconPixels(role)}
      modifiers={muted === true ? [mutedStyle] : undefined}
    />
  );
}
