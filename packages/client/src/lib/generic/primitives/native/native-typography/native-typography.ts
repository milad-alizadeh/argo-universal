import type { UniversalTextStyle } from '@expo/ui';
import { Platform } from 'react-native';
import { type TextRole, useTextStyle } from '#primitives/display/text';
import { swiftFontFace } from './swift-font-face';

// React Native's font weights, by name and number, as SwiftUI and Compose name them.
const fontWeights = new Map<
  string,
  NonNullable<UniversalTextStyle['fontWeight']>
>([
  ['normal', 'normal'],
  ['bold', 'bold'],
  ['100', '100'],
  ['200', '200'],
  ['300', '300'],
  ['400', '400'],
  ['500', '500'],
  ['600', '600'],
  ['700', '700'],
  ['800', '800'],
  ['900', '900'],
]);

// A text role as Expo UI's universal Text takes it on both phones; colour is left to the Host's palette.
export function useUniversalTextStyle(role: TextRole): UniversalTextStyle {
  const style = useTextStyle(role);

  return {
    fontFamily: nativeFamily(style.fontFamily),
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: fontWeights.get(String(style.fontWeight)),
    letterSpacing: style.letterSpacing,
  };
}

// SwiftUI takes a system face as no family; Compose names the sans-serif family sansSerif.
function nativeFamily(family: string | undefined): string | undefined {
  if (Platform.OS === 'ios') return swiftFontFace(family).family;

  return family === 'sans-serif' ? 'sansSerif' : family;
}
