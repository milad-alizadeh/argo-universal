import { Host as ExpoHost, type UniversalHostProps } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';

export type HostProps = Omit<
  UniversalHostProps,
  'colorScheme' | 'seedColor'
> & {
  // iOS only: lets the content draw into the safe area instead of being pushed out of it.
  ignoreSafeArea?: 'all';
};

// A native Host in Argo's Appearance. The accent token is the only colour native controls get: Android builds its Material palette from it, iOS tints with it.
export function Host({ children, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();

  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors.accent}
    >
      {children}
    </ExpoHost>
  );
}
