import { useNativeTheme, type NativeTheme } from '@repo/client/native-theme';
import { useMemo } from 'react';
import type { Palette } from './model';

type PendingPalette = { [Role in keyof Palette]: string | undefined };

const rgbChannels = 3;

const hexRadix = 16;

const hexByteWidth = 2;

function byteHex(value: number): string {
  return value.toString(hexRadix).padStart(hexByteWidth, '0');
}

function canResolve(token?: string): token is string {
  return Boolean(token) && typeof document !== 'undefined';
}

function rgb(token?: string): string | undefined {
  if (!canResolve(token)) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Canvas colour conversion is unavailable');
  context.fillStyle = token;
  context.fillRect(0, 0, 1, 1);

  const bytes = [...context.getImageData(0, 0, 1, 1).data].slice(
    0,
    rgbChannels,
  );

  return `#${bytes.map(byteHex).join('')}`;
}

function complete(palette: PendingPalette): palette is Palette {
  return Object.values(palette).every((value) => typeof value === 'string');
}

type ChromePalette = Pick<PendingPalette, 'card' | 'foreground' | 'border'>;

type MeasurePalette = Omit<
  PendingPalette,
  'card' | 'foreground' | 'border' | 'light'
>;

function useChromeColors(colors: NativeTheme['colors']): ChromePalette {
  const { card, foreground, border } = colors;

  return useMemo(
    () => ({
      card: rgb(card),
      foreground: rgb(foreground),
      border: rgb(border),
    }),
    [card, foreground, border],
  );
}

function useMeasureColors(colors: NativeTheme['colors']): MeasurePalette {
  const { mutedForeground, warning, danger, muted } = colors;

  return useMemo(
    () => ({
      mutedForeground: rgb(mutedForeground),
      warning: rgb(warning),
      danger: rgb(danger),
      muted: rgb(muted),
    }),
    [mutedForeground, warning, danger, muted],
  );
}

function resolvePalette(
  chrome: ChromePalette,
  measures: MeasurePalette,
  scheme: NativeTheme['colorScheme'],
): Palette | undefined {
  const palette = {
    ...chrome,
    ...measures,
    light: scheme === 'dark' ? chrome.foreground : chrome.card,
  };

  return complete(palette) ? palette : undefined;
}

export function usePalette(): Palette | undefined {
  const { colors, colorScheme } = useNativeTheme();
  const chrome = useChromeColors(colors);
  const measures = useMeasureColors(colors);

  return useMemo(
    () => resolvePalette(chrome, measures, colorScheme),
    [chrome, measures, colorScheme],
  );
}
