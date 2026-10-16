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

// The Host supplies Appearance and the accent; primitives map colours through public component APIs.
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
