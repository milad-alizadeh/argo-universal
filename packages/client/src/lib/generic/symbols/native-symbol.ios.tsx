import { Image } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { isCustomSymbol } from './custom-symbols';
import { iconSymbols } from './icon-names';
import { useIconPixels } from './icon-role';
import type { NativeSymbolProps } from './native-symbol-props';
import type { SymbolSource } from './symbol-source';

const mutedStyle = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

// An Argo icon inside a SwiftUI tree, which cannot hold a React Native view.
export function NativeSymbol({
  name,
  role,
  filled = false,
  muted = false,
}: NativeSymbolProps): React.JSX.Element {
  const symbol: SymbolSource = iconSymbols[name];
  const sf = (filled && symbol.sfFilled) || symbol.sf;
  const source = isCustomSymbol(sf) ? { assetName: sf } : { systemName: sf };
  return (
    <Image
      {...source}
      size={useIconPixels(role)}
      modifiers={muted ? [mutedStyle] : undefined}
    />
  );
}
