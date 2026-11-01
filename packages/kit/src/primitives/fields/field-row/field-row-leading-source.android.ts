import type { ImageSourcePropType } from 'react-native';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { resolveIcon } from '../../../symbols/icon-symbol';
import { nativeIconName } from '../../../symbols/native-icon-name';
import { svgDrawing } from '../../../symbols/svg-drawings.android';
import { withPlugFallback } from './field-row-plug-fallback';
import type { RowTextProps } from './field-row-text';

type Leading = NonNullable<RowTextProps['leading']>;

type IconName = ReturnType<typeof nativeIconName>;

const isPair = (name: IconName): boolean =>
  typeof name === 'object' && name !== null && 'ios' in name;

const isDrawing = (name: IconName): name is ImageSourcePropType =>
  name !== undefined && typeof name !== 'string' && !isPair(name);

function svgSource(leading: Leading): ImageSourcePropType | undefined {
  const { symbol, materialFill } = resolveIcon(leading);
  const drawn = drawnSymbol(symbol, false, materialFill);

  return drawn.kind === 'svg' ? svgDrawing(drawn.svg) : undefined;
}

// The Android drawing of an icon: Material's XML, or the vector drawable of an SVG icon (ADR-0041); none for a name with neither.
function drawingOf(leading: Leading): ImageSourcePropType | undefined {
  const name = nativeIconName(leading) ?? svgSource(leading);

  return isDrawing(name) ? name : undefined;
}

// What a row's leading icon draws on Android (see withPlugFallback).
export const leadingSource = (
  leading: RowTextProps['leading'],
): ImageSourcePropType | undefined => withPlugFallback(leading, drawingOf);
