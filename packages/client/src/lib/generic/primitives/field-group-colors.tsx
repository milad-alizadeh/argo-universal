import {
  HostPaletteContext,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { Platform, processColor } from 'react-native';
import { useResolveClassNames } from 'uniwind';
type ChildrenProps = { children: React.ReactNode };
const rgbMask = 0xffffff;
const hexRadix = 16;
const rgbHexLength = 6;
export function PlatformFieldColors({
  children,
}: ChildrenProps): React.ReactNode {
  if (Platform.OS === 'android')
    return <AndroidFieldColors>{children}</AndroidFieldColors>;
  return children;
}

function AndroidFieldColors({ children }: ChildrenProps): React.JSX.Element {
  const colors = useMaterialColors();
  const surface = processColor(
    useResolveClassNames('bg-muted').backgroundColor,
  );
  const palette = {
    ...colors,
    surfaceContainer: surfaceContainer(surface, colors.surfaceContainer),
  };
  return (
    <HostPaletteContext.Provider value={palette}>
      {children}
    </HostPaletteContext.Provider>
  );
}

function surfaceContainer(
  surface: ReturnType<typeof processColor>,
  fallback: `#${string}`,
): `#${string}` {
  return typeof surface === 'number'
    ? `#${(surface & rgbMask).toString(hexRadix).padStart(rgbHexLength, '0')}ff`
    : fallback;
}
