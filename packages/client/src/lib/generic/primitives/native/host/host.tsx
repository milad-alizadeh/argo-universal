import { Host as ExpoHost, type UniversalHostProps } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { HostTheme } from './host-theme';

export type HostProps = Omit<
  UniversalHostProps,
  'colorScheme' | 'seedColor'
> & {
  // iOS only: lets the content draw into the safe area instead of being pushed out of it.
  ignoreSafeArea?: 'all';
};

// iOS uses the accent as tint; Android's theme maps Material roles to Argo's tokens.
export function Host({ children, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();

  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors.accent}
    >
      <HostTheme colors={theme.colors}>{children}</HostTheme>
    </ExpoHost>
  );
}
