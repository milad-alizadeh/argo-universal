import type { IconSize } from '@repo/contracts/kit-symbols';
import { useContext } from 'react';
import type { ViewStyle } from 'react-native';
import {
  type SizeClassValue,
  sizeClassValue,
} from '../use-size-class/size-class-value';
import { useSizeClass } from '../use-size-class/use-size-class';
import { useWide } from '../use-wide/use-wide';
import { GlyphScaleContext } from './glyph-scale-context';
import { glyphPixels } from './glyph-sizing';

export type { IconSize } from '@repo/contracts/kit-symbols';

// A size, or one per size class when the icon's place changes with the window.
export type IconSizeValue = SizeClassValue<IconSize>;

export function useIconPixels(size: IconSizeValue): number {
  const wide = useWide();
  const scale = useContext(GlyphScaleContext) ?? (wide ? 'wide' : 'phone');

  return glyphPixels(sizeClassValue(size, useSizeClass()), scale);
}

export function useIconBox(
  size: IconSizeValue,
): Pick<ViewStyle, 'width' | 'height'> {
  const pixels = useIconPixels(size);

  return { width: pixels, height: pixels };
}
