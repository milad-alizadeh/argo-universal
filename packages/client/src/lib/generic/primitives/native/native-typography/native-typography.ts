import type { UniversalTextStyle } from '@expo/ui';
import { Platform } from 'react-native';
import { type TextRole, useTextStyle } from '#primitives/display/text';
import { swiftFontFace } from './swift-font-face';

type NativeFontWeight = NonNullable<UniversalTextStyle['fontWeight']>;

// React Native's font weights, by name and number, which the universal Text takes as they are.
const fontWeights: readonly NativeFontWeight[] = [
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
];

const fontWeight = (
  weight: ReturnType<typeof useTextStyle>['fontWeight'],
): NativeFontWeight | undefined =>
  fontWeights.find((name) => name === String(weight));

// A text role as Expo UI's universal Text takes it on both phones; colour is left to the Host's palette.
export function useUniversalTextStyle(role: TextRole): UniversalTextStyle {
  const style = useTextStyle(role);

  return {
    fontFamily: nativeFamily(style.fontFamily),
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: fontWeight(style.fontWeight),
    letterSpacing: style.letterSpacing,
  };
}

// SwiftUI takes a system face as no family; Compose names the sans-serif family sansSerif.
function nativeFamily(family: string | undefined): string | undefined {
  if (Platform.OS === 'ios') return swiftFontFace(family).family;

  return family === 'sans-serif' ? 'sansSerif' : family;
}
