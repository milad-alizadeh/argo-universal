import { type ScreenWidth, screenDefaults } from '@repo/contracts/kit-tokens';
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { type ContentColumn } from '#kit/content-column/content-column';
import { useWide } from '#kit/use-wide/use-wide';

/*
 * The one column a Screen's heading and content keep to: on a wide window the reading width (`--container-column`)
 * centred in the region, or the whole region for `full` (no max width), inside the Screen's side margins either way.
 * Below wide the phone shell's header runs from the window's edge, so the content does too. `narrow` holds one short
 * task to `--container-narrow` on every window, as it would otherwise stretch on a tablet. `bleed` runs the content to
 * the region's edges with no margins, for a canvas or a map. An aside never widens the column (screen-aside-place.ts).
 */
export function useScreenColumn(
  width: ScreenWidth = screenDefaults.width,
): ContentColumn {
  const capped = useWide() && width === 'content';
  const { column, narrow, inset } = useColumnTokens();
  const cap = columnCap(width, capped, { column, narrow });
  const margin = width === 'bleed' ? 0 : inset;

  return useMemo(() => columnStyle(cap, margin), [cap, margin]);
}

type ColumnWidths = { column: number; narrow: number };

type ColumnTokens = ColumnWidths & { inset: number };

export function useColumnTokens(): ColumnTokens {
  return {
    column: tokenNumber(useCSSVariable('--container-column')),
    narrow: tokenNumber(useCSSVariable('--container-narrow')),
    inset: tokenNumber(useCSSVariable(usePaddingToken())),
  };
}

function columnCap(
  width: ScreenWidth,
  capped: boolean,
  { column, narrow }: ColumnWidths,
): number | undefined {
  if (width === 'narrow') return narrow;

  return capped ? column : undefined;
}

const columnStyle = (
  cap: number | undefined,
  inset: number,
): ContentColumn => ({
  maxWidth: cap === undefined ? undefined : cap + inset * 2,
  paddingLeft: inset,
  paddingRight: inset,
});

// Under a Screen's heading: a phone's small gap below its header, and room at the content's end.
export const screenContentEnds = 'pt-2 pb-6 wide:pt-0';

// A token a host hasn't defined reads as 0 rather than NaN.
function tokenNumber(value: string | number | undefined): number {
  const number = Number.parseFloat(String(value));

  return Number.isFinite(number) ? number : 0;
}

export function ScreenColumn({
  width,
  children,
}: {
  width?: ScreenWidth;
  children: ReactNode;
}): ReactElement {
  const style = useScreenColumn(width);

  return (
    <View className="w-full self-center" style={style}>
      {children}
    </View>
  );
}

// A wide inset holds the Back button that hangs left of a drill-in page's title (page-back).
function usePaddingToken(): string {
  return useWide() ? '--spacing-8' : '--spacing-4';
}
