import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { useWide } from '#lib/generic/use-wide/use-wide';

interface PageColumnStyle {
  maxWidth: number;
  paddingLeft: number;
  paddingRight: number;
}

export function usePageColumn(): PageColumnStyle {
  const [width, padding] = useCSSVariable([
    '--container-column',
    useWide() ? '--spacing-6' : '--spacing-4',
  ]).map(tokenNumber);

  const inset = padding ?? 0;

  return {
    maxWidth: (width ?? 0) + inset * 2,
    paddingLeft: inset,
    paddingRight: inset,
  };
}

function tokenNumber(value: string | number | undefined): number {
  return Number.parseFloat(String(value));
}

export function PageColumn({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const style = usePageColumn();

  return (
    <View className="w-full self-center" style={style}>
      {children}
    </View>
  );
}
