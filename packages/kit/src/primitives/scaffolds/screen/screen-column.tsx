import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useWide } from '#kit/use-wide/use-wide';

interface ScreenColumnStyle {
  maxWidth: number;
  paddingLeft: number;
  paddingRight: number;
}

export function useScreenColumn(): ScreenColumnStyle {
  const [width = 0, inset = 0] = useCSSVariable([
    '--container-column',
    usePaddingToken(),
  ]).map(tokenNumber);

  return {
    maxWidth: width + inset * 2,
    paddingLeft: inset,
    paddingRight: inset,
  };
}

// A token a host hasn't defined reads as 0 rather than NaN.
function tokenNumber(value: string | number | undefined): number {
  const number = Number.parseFloat(String(value));

  return Number.isFinite(number) ? number : 0;
}

export function ScreenColumn({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const style = useScreenColumn();

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
