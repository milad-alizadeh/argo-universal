import { useNativeTheme } from '#lib/generic/native-theme';

/*
 * The one place a phone picks its surface colours. A sheet or grouped page is the grey page
 * surface; everything on it (list rows and cards, text fields, a sheet's search, a picker's
 * options) is the lighter row surface. Primitives take these, so features never colour a surface.
 */
export const pageSurface = 'bg-content';

export const rowSurface = 'bg-card';

interface SurfaceColors {
  page?: string;
  row?: string;
}

// The same two surfaces as colours, for native views that take a colour rather than a class.
export function useSurfaceColors(): SurfaceColors {
  const { content, card } = useNativeTheme().colors;

  return { page: content, row: card };
}
