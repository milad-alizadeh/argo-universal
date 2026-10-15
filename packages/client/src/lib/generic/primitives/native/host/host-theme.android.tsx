import {
  HostPaletteContext,
  type MaterialColors,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { requireNativeView } from 'expo';
import { useMemo } from 'react';
import { materialPalette } from './host-palette';
import type { HostThemeProps } from './host-theme-props';

const NativeHostTheme = requireNativeView<{
  children: HostThemeProps['children'];
  colors: MaterialColors;
}>('ClientTheme', 'HostTheme');

// FieldGroup.Section reads Expo's JS context and sends explicit row colours to Compose.
export function HostTheme({
  colors,
  children,
}: HostThemeProps): React.JSX.Element {
  const base = useMaterialColors();
  const palette = useMemo(() => materialPalette(base, colors), [base, colors]);

  return (
    <HostPaletteContext.Provider value={palette}>
      <NativeHostTheme colors={palette}>{children}</NativeHostTheme>
    </HostPaletteContext.Provider>
  );
}
