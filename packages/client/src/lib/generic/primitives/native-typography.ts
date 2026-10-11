import type { Text as ComposeText } from '@expo/ui/jetpack-compose';
import { font, lineHeight } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import { type TextRole, useTextStyle } from './text';

type ComposeTextStyle = NonNullable<
  ComponentProps<typeof ComposeText>['style']
>;

const fontWeights: Record<
  string,
  {
    swift: NonNullable<Parameters<typeof font>[0]['weight']>;
    compose: NonNullable<ComposeTextStyle['fontWeight']>;
  }
> = {
  normal: { swift: 'regular', compose: 'normal' },
  bold: { swift: 'bold', compose: 'bold' },
  '100': { swift: 'ultraLight', compose: '100' },
  '200': { swift: 'thin', compose: '200' },
  '300': { swift: 'light', compose: '300' },
  '400': { swift: 'regular', compose: '400' },
  '500': { swift: 'medium', compose: '500' },
  '600': { swift: 'semibold', compose: '600' },
  '700': { swift: 'bold', compose: '700' },
  '800': { swift: 'heavy', compose: '800' },
  '900': { swift: 'black', compose: '900' },
};

export function useSwiftUITextModifiers(
  role: TextRole,
): ReturnType<typeof font>[] {
  const style = useTextStyle(role);
  const { fontScale } = useWindowDimensions();
  return [
    font(swiftFont(style, fontScale)),
    ...swiftLeading(style.lineHeight, fontScale),
  ];
}

function swiftFont(
  style: ReturnType<typeof useTextStyle>,
  fontScale: number,
): Parameters<typeof font>[0] {
  const family = swiftFamily(style.fontFamily);
  return {
    family,
    size:
      family === undefined
        ? scaledValue(style.fontSize, fontScale)
        : style.fontSize,
    weight: fontWeights[String(style.fontWeight)]?.swift,
  };
}

function swiftFamily(family: string | undefined): string | undefined {
  return family === 'System' ? undefined : family;
}

function swiftLeading(
  leading: number | undefined,
  fontScale: number,
): ReturnType<typeof lineHeight>[] {
  return leading === undefined ? [] : [lineHeight(leading * fontScale)];
}

function scaledValue(
  value: number | undefined,
  scale: number,
): number | undefined {
  return value === undefined ? undefined : value * scale;
}

export function useComposeTextStyle(role: TextRole): ComposeTextStyle {
  const style = useTextStyle(role);
  return {
    fontFamily: composeFamily(style.fontFamily),
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: fontWeights[String(style.fontWeight)]?.compose,
    letterSpacing: style.letterSpacing,
  };
}

function composeFamily(family: string | undefined): string | undefined {
  return family === 'sans-serif' ? 'sansSerif' : family;
}
