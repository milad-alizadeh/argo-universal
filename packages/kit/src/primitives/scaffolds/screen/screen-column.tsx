import { type ScreenWidth, screenDefaults } from '@repo/contracts/kit-tokens';
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useWide } from '#kit/use-wide/use-wide';

interface ScreenColumnStyle {
  // Unset for a `full` Screen, which fills its region, and below wide.
  maxWidth?: number;
  paddingLeft: number;
  paddingRight: number;
}

/*
 * The one column a Screen's heading and content keep to: on a wide window the reading width (`--container-column`)
 * centred in the region, or the whole region for `full`, inside the Screen's side margins either way. Below wide the
 * phone shell's header runs from the window's edge, so the content does too.
 */
export function useScreenColumn(
  width: ScreenWidth = screenDefaults.width,
): ScreenColumnStyle {
  const capped = useWide() && width === 'content';
  const [column, inset] = useColumnTokens();

  return useMemo(
    () => columnStyle(capped, column, inset),
    [capped, column, inset],
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
): ScreenColumnStyle => ({
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
