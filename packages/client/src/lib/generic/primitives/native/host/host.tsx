import { Host as ExpoHost, type UniversalHostProps } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { HostPalette } from './host-palette';

export type HostProps = Omit<
  UniversalHostProps,
  'colorScheme' | 'seedColor'
> & {
  // iOS only: lets the content draw into the safe area instead of being pushed out of it.
  ignoreSafeArea?: 'all';
};

// A native Host in Argo's Appearance. Seeding it with the tint also keeps Android off wallpaper colours.
export function Host({ children, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();

  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors.tint}
    >
      <HostPalette colors={theme.colors}>{children}</HostPalette>
    </ExpoHost>
  );
}
