import { Host as ComposeHost } from '@expo/ui/jetpack-compose';
import { useContext, useMemo } from 'react';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { materialColorOverrides } from '#primitives/native/material-palette';
import { InsideHostContext } from './host-nesting';
import type { HostProps } from './host-props';

/*
 * Compose's Host: the seed alone would build a tonal palette that turns Argo's grey primary green, so every
 * Material 3 role Argo has a token for replaces the seeded one, and stock Compose controls draw in Argo's colours.
 * Inside a FieldGroup it draws its children into the FieldGroup's tree, which keeps its own seed.
 */
export function Host({
  children,
  seed,
  ignoreSafeArea: _iOSOnly,
  ...props
}: HostProps): React.ReactNode {
  const theme = useHostTheme(seed);

  if (useContext(InsideHostContext)) return children;

  return (
    <ComposeHost {...props} {...theme}>
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
