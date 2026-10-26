// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { useIconSize } from '#primitives/content/icon';
import { useIconPixels } from './icon-size';
import { iosImage } from './ios-image';
import type { NativeSymbolProps } from './native-symbol-props';

// Argo's own symbols are in the app's asset catalog; an SVG symbol has no image a SwiftUI tree can draw.
function imageSource(
  icon: NativeSymbolProps['name'],
  filled: boolean | undefined,
): Pick<ImageProps, 'assetName' | 'systemName'> {
  const image = iosImage(icon, filled);

  if (!image) return {};

  return image.kind === 'asset'
    ? { assetName: image.name }
    : { systemName: image.name };
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
  const pixels = useIconPixels(useIconSize(size));

  return (
    <Image
      {...imageSource(name, filled)}
      size={pixels}
      modifiers={useMutedStyle(muted)}
    />
  );
}
