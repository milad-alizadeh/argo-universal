import {
  HostPaletteContext,
  type MaterialColors,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useMemo } from 'react';
import { useSurfaceColors } from '#primitives/native/surface';

/*
 * Stock Compose components read the Host's Material palette for their surfaces: a grouped list
 * fills its page with `surface` and its rows with `surfaceContainer`. Argo's surfaces take those
 * roles, so every Material list and card in the Host draws the page grey and the rows lighter.
 */
export function HostPalette({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <HostPaletteContext.Provider value={useSurfacePalette()}>
      {children}
    </HostPaletteContext.Provider>
  );
}

function useSurfacePalette(): MaterialColors {
  const palette = useMaterialColors();
  const { page, row } = useSurfaceColors();

  return useMemo(
    () => ({
      ...palette,
      surface: hexOr(page, palette.surface),
      surfaceContainer: hexOr(row, palette.surfaceContainer),
    }),
    [palette, page, row],
  );
}

type PaletteColor = MaterialColors['surface'];

// Material's palette holds hex colours; a token Uniwind has not resolved to one keeps Material's.
function hexOr(
  color: string | undefined,
  fallback: PaletteColor,
): PaletteColor {
  return isHex(color) ? color : fallback;
}

function isHex(color: string | undefined): color is PaletteColor {
  return color?.startsWith('#') ?? false;
}
