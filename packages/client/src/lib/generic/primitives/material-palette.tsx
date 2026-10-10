import {
  HostPaletteContext,
  type MaterialColors,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useMemo } from 'react';
import { processColor } from 'react-native';
import type { NativeColors } from '#lib/generic/native-theme';

type RgbaHex = MaterialColors['primary'];

const rgbMask = 0xffffff;
const alphaShift = 24;
const alphaMask = 0xff;
const hexRadix = 16;
const rgbDigits = 6;
const alphaDigits = 2;

// Gives Compose children Argo's Material roles in place of the Host's seeded palette.
export function MaterialPalette(props: {
  colors: NativeColors;
  children: React.ReactNode;
}): React.JSX.Element {
  const seeded = useMaterialColors();
  const palette = useMemo(
    () => argoPalette(seeded, props.colors),
    [seeded, props.colors],
  );
  return (
    <HostPaletteContext.Provider value={palette}>
      {props.children}
    </HostPaletteContext.Provider>
  );
}

function argoPalette(
  seeded: MaterialColors,
  colors: NativeColors,
): MaterialColors {
  return {
    ...seeded,
    primary: role(colors.primary, seeded.primary),
    onPrimary: role(colors.primaryForeground, seeded.onPrimary),
    surface: role(colors.background, seeded.surface),
    surfaceContainer: role(colors.muted, seeded.surfaceContainer),
    surfaceContainerHigh: role(colors.popover, seeded.surfaceContainerHigh),
    onSurface: role(colors.foreground, seeded.onSurface),
    onSurfaceVariant: role(colors.mutedForeground, seeded.onSurfaceVariant),
    outline: role(colors.border, seeded.outline),
    error: role(colors.destructive, seeded.error),
  };
}

function role(color: string | undefined, fallback: RgbaHex): RgbaHex {
  return toRgbaHex(color) ?? fallback;
}

function toRgbaHex(color: string | undefined): RgbaHex | undefined {
  const argb = color === undefined ? undefined : processColor(color);
  if (typeof argb !== 'number') return undefined;
  const rgb = (argb & rgbMask).toString(hexRadix).padStart(rgbDigits, '0');
  const alpha = ((argb >>> alphaShift) & alphaMask)
    .toString(hexRadix)
    .padStart(alphaDigits, '0');
  return `#${rgb}${alpha}`;
}
