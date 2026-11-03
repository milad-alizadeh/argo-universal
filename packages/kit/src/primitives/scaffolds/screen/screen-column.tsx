import { type ScreenWidth, screenDefaults } from '@repo/contracts/kit-tokens';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useMemo,
} from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { type ContentColumn } from '#kit/content-column/content-column';
import { useWide } from '#kit/use-wide/use-wide';
import type { ColumnEdges } from './screen-aside-place';

// Where the Screen's aside put the column, beside its own (screen-aside-place.ts); null keeps the column centred.
export const ScreenColumnEdgesContext = createContext<ColumnEdges | null>(null);

/*
 * The one column a Screen's heading and content keep to: on a wide window the reading width (`--container-column`)
 * centred in the region, or the whole region for `full` (no max width), inside the Screen's side margins either way.
 * Below wide the phone shell's header runs from the window's edge, so the content does too. `bleed` runs the content to
 * the region's edges with no margins, for a canvas or a map. Where the aside has its own column the capped column
 * keeps the edges it leaves, on every page at that width, with or without an aside, except a `narrow` page with none,
 * which stays centred (screen-aside-place.ts).
 */
export function useScreenColumn(
  width: ScreenWidth = screenDefaults.width,
): ContentColumn {
  const capped = useWide() && width === 'content';
  const { column, inset } = useColumnTokens();
  const cap = capped ? column : undefined;
  const margin = marginOf(width, inset);
  const beside = useEdgesBeside(cap);

  return useMemo(
    () => (beside ? edgesStyle(beside) : columnStyle(cap, margin)),
    [beside, cap, margin],
  );
}

// Only a capped column moves aside; a full one already runs to the margins.
function useEdgesBeside(cap: number | undefined): ColumnEdges | null {
  const edges = use(ScreenColumnEdgesContext);

  return cap === undefined ? null : edges;
}

const edgesStyle = ({ left, right }: ColumnEdges): ContentColumn => ({
  paddingLeft: left,
  paddingRight: right,
});

const marginOf = (width: ScreenWidth, inset: number): number =>
  width === 'bleed' ? 0 : inset;

// The heading, the aside's strip and the footer have no edge-to-edge drawing of their own: on a bleed page they keep the inset.
export const insetWidth = (
  width: ScreenWidth | undefined,
): ScreenWidth | undefined => (width === 'bleed' ? 'full' : width);

type ColumnTokens = { column: number; inset: number };

export function useColumnTokens(): ColumnTokens {
  return {
    column: tokenNumber(useCSSVariable('--container-column')),
    inset: tokenNumber(useCSSVariable(usePaddingToken())),
  };
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
