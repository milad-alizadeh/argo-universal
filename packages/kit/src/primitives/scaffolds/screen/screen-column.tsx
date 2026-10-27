import { type ScreenWidth, screenDefaults } from '@repo/contracts/kit-tokens';
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { sideColumnExtra } from '#kit/content-column/column-layout';
import {
  type ContentColumn,
  useSideColumn,
} from '#kit/content-column/content-column';
import { useWide } from '#kit/use-wide/use-wide';

/*
 * The one column a Screen's heading and content keep to: on a wide window the reading width (`--container-column`)
 * centred in the region, or the whole region for `full` (no max width), inside the Screen's side margins either way.
 * Below wide the phone shell's header runs from the window's edge, so the content does too. A side column beside the
 * content (a Detail's Metadata) widens the cap by itself, so the content keeps the reading width and the heading
 * spans both.
 */
export function useScreenColumn(
  width: ScreenWidth = screenDefaults.width,
): ContentColumn {
  const capped = useWide() && width === 'content';
  const side = sideColumnExtra(useSideColumn());
  const [column, inset] = useColumnTokens();

  return useMemo(
    () => columnStyle(capped, column + side, inset),
    [capped, column, side, inset],
  );
}

function useColumnTokens(): [column: number, inset: number] {
  const [column = 0, inset = 0] = useCSSVariable([
    '--container-column',
    usePaddingToken(),
  ]).map(tokenNumber);

  return [column, inset];
}

const columnStyle = (
  capped: boolean,
  column: number,
  inset: number,
): ContentColumn => ({
  maxWidth: capped ? column + inset * 2 : undefined,
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
