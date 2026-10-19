import type { DropdownMenuItem } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { NativeMenuItem } from './menu-native-items';

type DropdownMenuItemElementColors = NonNullable<
  React.ComponentProps<typeof DropdownMenuItem>['elementColors']
>;

// A row's Material colours; a danger row's label and leading icon take the error colour.
export function useItemColors(
  item: Pick<NativeMenuItem, 'tone'>,
): DropdownMenuItemElementColors {
  const palette = useMaterialPalette();

  return item.tone === 'danger'
    ? {
        ...palette.menuItemColors,
        textColor: palette.roles.error,
        leadingIconColor: palette.roles.error,
      }
    : palette.menuItemColors;
}
