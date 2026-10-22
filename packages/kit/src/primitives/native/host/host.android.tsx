import { Host as ComposeHost } from '@expo/ui/jetpack-compose';
import { useMemo } from 'react';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { materialColorOverrides } from '#primitives/native/material-palette';
import type { HostProps } from './host-props';

/*
 * Compose's Host: the seed alone would build a tonal palette that turns Argo's grey primary green, so every
 * Material 3 role Argo has a token for replaces the seeded one, and stock Compose controls draw in Argo's colours.
 */
export function Host({
  children,
  seed,
  ignoreSafeArea: _iOSOnly,
  ...props
}: HostProps): React.JSX.Element {
  return (
    <ComposeHost {...props} {...useHostTheme(seed)}>
      {children}
    </ComposeHost>
  );
}

type ThemeProps = Pick<
  React.ComponentProps<typeof ComposeHost>,
  'colorScheme' | 'seedColor' | 'colorOverrides'
>;

function useHostTheme(seed: HostProps['seed']): ThemeProps {
  const theme = useNativeTheme();

  const overrides = useMemo(
    () => materialColorOverrides(theme.colors),
    [theme.colors],
  );

  return {
    colorScheme: theme.colorScheme,
    seedColor: theme.colors[seed ?? 'accent'],
    colorOverrides: overrides,
  };
}
