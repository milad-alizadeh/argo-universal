import type { UniversalTextStyle } from '@expo/ui';
import { createModifier, font, lineHeight } from '@expo/ui/swift-ui/modifiers';
import { Platform, useWindowDimensions } from 'react-native';
import { type TextRole, useTextStyle } from '#primitives/display/text';
import { swiftFontFace } from './swift-font-face';

interface NativeFontWeight {
  swift: NonNullable<Parameters<typeof font>[0]['weight']>;
  universal: NonNullable<UniversalTextStyle['fontWeight']>;
}

// React Native's font weights, by name and number, as SwiftUI and Compose name them.
const fontWeights = new Map<string, NativeFontWeight>([
  ['normal', { swift: 'regular', universal: 'normal' }],
  ['bold', { swift: 'bold', universal: 'bold' }],
  ['100', { swift: 'ultraLight', universal: '100' }],
  ['200', { swift: 'thin', universal: '200' }],
  ['300', { swift: 'light', universal: '300' }],
  ['400', { swift: 'regular', universal: '400' }],
  ['500', { swift: 'medium', universal: '500' }],
  ['600', { swift: 'semibold', universal: '600' }],
  ['700', { swift: 'bold', universal: '700' }],
  ['800', { swift: 'heavy', universal: '800' }],
  ['900', { swift: 'black', universal: '900' }],
]);

export function useSwiftUITextModifiers(
  role: TextRole,
  alignment: 'line' | 'row' = 'line',
): ReturnType<typeof font>[] {
  const style = useTextStyle(role);
  const { fontScale } = useWindowDimensions();

  return [
    ...swiftLeading(style.lineHeight, fontScale, alignment),
    font(swiftFont(style, fontScale)),
  ];
}

function swiftFont(
  style: ReturnType<typeof useTextStyle>,
  fontScale: number,
): Parameters<typeof font>[0] {
  const face = swiftFontFace(style.fontFamily);

  return {
    ...face,
    size:
      face.family === undefined
        ? scaledValue(style.fontSize, fontScale)
        : style.fontSize,
    weight: fontWeights.get(String(style.fontWeight))?.swift,
  };
}

function swiftLeading(
  leading: number | undefined,
  fontScale: number,
  alignment: 'line' | 'row',
): ReturnType<typeof lineHeight>[] {
  if (leading === undefined) return [];
  const value = leading * fontScale;

  return [
    alignment === 'row'
      ? createModifier('balancedLineHeight', { value })
      : lineHeight(value),
  ];
}

function scaledValue(
  value: number | undefined,
  scale: number,
): number | undefined {
  return value === undefined ? undefined : value * scale;
}

// A text role as Expo UI's universal Text takes it on both phones; colour is left to the Host's palette.
export function useUniversalTextStyle(role: TextRole): UniversalTextStyle {
  const style = useTextStyle(role);

  return {
    fontFamily: nativeFamily(style.fontFamily),
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: fontWeights.get(String(style.fontWeight))?.universal,
    letterSpacing: style.letterSpacing,
  };
}

// SwiftUI takes a system face as no family; Compose names the sans-serif family sansSerif.
function nativeFamily(family: string | undefined): string | undefined {
  if (Platform.OS === 'ios') return swiftFontFace(family).family;

  return family === 'sans-serif' ? 'sansSerif' : family;
}
