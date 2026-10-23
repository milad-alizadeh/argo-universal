import type {
  ButtonColors,
  CardColors,
  DropdownMenuItem,
  FilterChipColors,
  ListItemColors,
} from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import type { PressableAndroidRippleConfig } from 'react-native';
import type { MaterialRoles } from './material-roles';

// DropdownMenuItem's `elementColors` type, which the package does not export by name.
type DropdownMenuItemElementColors = NonNullable<
  ComponentProps<typeof DropdownMenuItem>['elementColors']
>;

// A dialog answer's TextButton `colors`: the accent, or danger red.
export function dialogButtonColors(
  roles: MaterialRoles,
  danger: boolean,
): ButtonColors {
  return {
    contentColor: danger ? roles.error : roles.accent,
    disabledContentColor: roles.disabledContent,
  };
}

// DropdownMenuItem `elementColors`: foreground text and check, the leading icon and disabled rows muted.
export function menuItemColors(
  roles: MaterialRoles,
): DropdownMenuItemElementColors {
  return {
    textColor: roles.onSurface,
    disabledTextColor: roles.onSurfaceVariant,
    leadingIconColor: roles.onSurfaceVariant,
    disabledLeadingIconColor: roles.onSurfaceVariant,
    trailingIconColor: roles.onSurface,
    disabledTrailingIconColor: roles.onSurfaceVariant,
  };
}

// FilterChip `colors` (FilterChipColors): primary fill and foreground label when on, muted label when off.
export function chipColors(roles: MaterialRoles): FilterChipColors {
  return {
    labelColor: roles.onSurfaceVariant,
    selectedContainerColor: roles.primary,
    selectedLabelColor: roles.onPrimary,
    selectedLeadingIconColor: roles.onPrimary,
  };
}

// Card `colors` (CardColors): the filled card on the card fill.
export function cardColors(roles: MaterialRoles): CardColors {
  return {
    containerColor: roles.surfaceContainer,
    contentColor: roles.onSurface,
  };
}

// ListItem `colors` (ListItemColors): rows on the card surface.
export function listItemColors(roles: MaterialRoles): ListItemColors {
  return {
    containerColor: roles.surfaceContainer,
    contentColor: roles.onSurface,
    leadingContentColor: roles.onSurface,
    trailingContentColor: roles.onSurfaceVariant,
    supportingContentColor: roles.onSurfaceVariant,
  };
}

// Pressable `android_ripple` (PressableAndroidRippleConfig): the stock bounded ripple in the pressed tint.
export function ripple(roles: MaterialRoles): PressableAndroidRippleConfig {
  return { color: roles.pressed, borderless: false };
}
