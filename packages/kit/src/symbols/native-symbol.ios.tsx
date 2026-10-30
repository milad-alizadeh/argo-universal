// Stays SwiftUI Image: Expo UI's universal Icon draws only system symbols, and Argo's custom symbols are asset-catalog images.
import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { accessibilityHidden, frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { useIconSize } from '#primitives/content/icon';
import { appleRowSymbolPixels } from './glyph-sizing';
import { useIconPixels } from './icon-size';
import { iosImage } from './ios-image';
import type {
  NativeSymbolProps,
  NativeSymbolTone,
} from './native-symbol-props';

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

/*
 * The token the symbol draws in. Unset, SwiftUI colours it with the tint of the surface around it, which is the
 * accent colour inside a Form row; a `foreground` symbol takes Argo's glyph token instead, and a muted one takes
 * Argo's tertiary token where iOS would use its tertiary label grey.
 */
function useToneColor(tone: NativeSymbolTone | undefined): string | undefined {
  const { foreground, tertiary } = useNativeTheme().colors;

  if (tone === 'foreground') return foreground;

  return tone === 'muted' ? tertiary : undefined;
}

/*
 * An Argo icon inside a SwiftUI tree, which cannot hold a React Native view. SF Symbols fill their point size to
 * different widths, so the symbol sits in a square frame of its own size: every title beside one starts on the same
 * line whichever symbol its row names. A row's glyph keeps that frame as its lane and draws smaller inside it, at
 * the size stock iOS Settings draws a row's mark (appleRowSymbolPixels).
 *
 * It is hidden from VoiceOver, as every other drawn glyph is (decorative-glyph.ts): the Label around it reads its
 * own title, while the Image on its own would read the SF Symbol's name (#1505).
 */
export function NativeSymbol(props: NativeSymbolProps): React.JSX.Element {
  const lane = useIconPixels(useIconSize(props.size));
  const pixels = props.lane === 'row' ? appleRowSymbolPixels(lane) : lane;

  return (
    <Image
      {...imageSource(props.name, props.filled)}
      size={pixels}
      color={useToneColor(props.tone)}
      modifiers={[frame({ width: lane, height: lane }), accessibilityHidden()]}
    />
  );
}
