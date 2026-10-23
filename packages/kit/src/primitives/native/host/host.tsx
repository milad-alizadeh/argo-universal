import { Host as ExpoHost } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import type { HostProps } from './host-props';

/*
 * Every Expo UI tree in Argo sits in this Host, which themes it the way Expo intends: the Appearance and a
 * seed colour. iOS tints SwiftUI with the seed; the web derives `--expo-ui-primary-*` from it.
 */
export function Host({ seed, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();

  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors[seed ?? 'accent']}
    />
  );
}
