import { Image, type ImageProps } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { appleSymbol } from './apple-symbol';
import { type AppleSymbol, isCustomSymbol } from './custom-symbols';
import { iconSymbols } from './icon-names';
import { useIconPixels } from './icon-role';
import type { NativeSymbolProps } from './native-symbol-props';

const mutedStyle = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });

type SymbolModifiers = ReturnType<typeof foregroundStyle>[] | undefined;

// The regular weight, as the React Native Icon draws it, whatever weight the row's text sets around it.
const symbolFont = (size: number): ReturnType<typeof font> =>
  font({ size, weight: 'regular' });

const accentStyle = (color: string | undefined): SymbolModifiers =>
  color ? [foregroundStyle(color)] : undefined;

function useToneModifiers(
  props: Pick<NativeSymbolProps, 'muted' | 'accent'>,
): SymbolModifiers {
  const { accent } = useNativeTheme().colors;

  if (props.accent === true) return accentStyle(accent);

  return props.muted === true ? [mutedStyle] : undefined;
}

// The stock List checkmark's font, which scales with Dynamic Type.
const systemMarkFont = font({ textStyle: 'body', weight: 'semibold' });

function useSymbolModifiers({
  role,
  systemMark,
  ...tone
}: Pick<
  NativeSymbolProps,
  'role' | 'systemMark' | 'muted' | 'accent'
>): ReturnType<typeof font>[] {
  const size = useIconPixels(role);
  const symbolSize = systemMark === true ? systemMarkFont : symbolFont(size);

  return [symbolSize, ...(useToneModifiers(tone) ?? [])];
}

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
  ...look
}: NativeSymbolProps): React.JSX.Element {
  return (
    <Image
      {...imageSource(appleSymbol(iconSymbols[name], filled))}
      modifiers={useSymbolModifiers({ role, ...look })}
    />
  );
}
