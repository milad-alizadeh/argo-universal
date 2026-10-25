import { Host as ExpoHost } from '@expo/ui';
import { type ReactNode, useContext } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { InsideHostContext } from './host-nesting';
import type { HostProps } from './host-props';
import { useRedactionProps } from './host-redaction-props';

/*
 * Every Expo UI tree in Argo sits in this Host, which themes it the way Expo intends: the Appearance and a
 * seed colour. iOS tints SwiftUI with the seed; the web derives `--expo-ui-primary-*` from it.
 * Inside a FieldGroup it draws its children into the FieldGroup's tree, which keeps its own seed.
 */
export function Host({ seed, children, ...props }: HostProps): ReactNode {
  const theme = useNativeTheme();
  const redaction = useRedactionProps();

  if (useContext(InsideHostContext)) return children;

  return (
    <ExpoHost
      {...props}
      {...redaction}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors[seed ?? 'accent']}
    >
      {children}
    </ExpoHost>
  );
}
