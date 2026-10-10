import { Host as ExpoHost, type UniversalHostProps } from '@expo/ui';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { MaterialPalette } from './material-palette';

export type HostProps = Omit<UniversalHostProps, 'colorScheme' | 'seedColor'>;

// A native Host in Argo's Appearance. Seeding it with the tint also keeps Android off wallpaper colours.
export function Host({ children, ...props }: HostProps): React.JSX.Element {
  const theme = useNativeTheme();
  return (
    <ExpoHost
      {...props}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors.tint}
    >
      {Platform.OS === 'android' ? (
        <MaterialPalette colors={theme.colors}>{children}</MaterialPalette>
      ) : (
        children
      )}
    </ExpoHost>
  );
}
