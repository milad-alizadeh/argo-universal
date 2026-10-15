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

// A native Host in Argo's Appearance. Android builds its Material palette from the accent token, then takes Argo's surfaces; iOS tints with the accent.
export function Host({ children, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();

  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors.accent}
    >
      <HostPalette>{children}</HostPalette>
    </ExpoHost>
  );
}
