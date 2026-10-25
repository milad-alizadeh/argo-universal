import { Host as ExpoHost } from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import { type ReactNode, useContext } from 'react';
import { Platform } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { useSkeletonRedacted } from '#primitives/status/skeleton';
import { InsideHostContext } from './host-nesting';
import type { HostProps } from './host-props';

/*
 * Inside a loading Skeleton SwiftUI draws its own placeholder shapes, one per text line, image and control. This is
 * Expo's `redacted('placeholder')` built from its plain modifier factory, which does not load the ExpoUI native
 * module on the web as the swift-ui modifiers file does.
 */
const placeholder = [createModifier('redacted', { reasons: ['placeholder'] })];

const redaction = (active: boolean): { modifiers?: typeof placeholder } =>
  active && Platform.OS === 'ios' ? { modifiers: placeholder } : {};

/*
 * Every Expo UI tree in Argo sits in this Host, which themes it the way Expo intends: the Appearance and a
 * seed colour. iOS tints SwiftUI with the seed; the web derives `--expo-ui-primary-*` from it.
 * Inside a FieldGroup it draws its children into the FieldGroup's tree, which keeps its own seed.
 */
export function Host({ seed, children, ...props }: HostProps): ReactNode {
  const theme = useNativeTheme();
  const skeleton = useSkeletonRedacted();

  if (useContext(InsideHostContext)) return children;

  return (
    <ExpoHost
      {...props}
      {...redaction(skeleton)}
      colorScheme={theme.colorScheme}
      seedColor={theme.colors[seed ?? 'accent']}
    >
      {children}
    </ExpoHost>
  );
}
