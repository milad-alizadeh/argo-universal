// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { isCustomSymbol } from './custom-symbols';
import { type DrawnSymbol, drawnSymbol } from './drawn-symbol';
import { useIconPixels } from './icon-size';
import { resolveIcon } from './icon-symbol';
import type { NativeSymbolProps } from './native-symbol-props';

// Argo's custom symbols are in the app's asset catalog; an SVG symbol has no image a SwiftUI tree can draw.
function imageSource(
  symbol: DrawnSymbol,
): Pick<ImageProps, 'assetName' | 'systemName'> {
  if (symbol.kind === 'svg') return {};

  return isCustomSymbol(symbol.sf)
    ? { assetName: symbol.sf }
    : { systemName: symbol.sf };
}

// A muted symbol takes Argo's tertiary token where iOS would use its tertiary label grey.
function useMutedStyle(muted: boolean | undefined): ImageProps['modifiers'] {
  const { tertiary } = useNativeTheme().colors;

  return muted === true && tertiary !== undefined
    ? [foregroundStyle(tertiary)]
    : [];
}

// An Argo icon inside a SwiftUI tree, which cannot hold a React Native view.
export function NativeSymbol({
  name,
  size,
  filled,
  muted,
}: NativeSymbolProps): React.JSX.Element {
  const pixels = useIconPixels(size);

  return (
    <Image
      {...imageSource(drawnSymbol(resolveIcon(name).symbol, filled))}
      size={pixels}
      modifiers={useMutedStyle(muted)}
    />
  );
}
