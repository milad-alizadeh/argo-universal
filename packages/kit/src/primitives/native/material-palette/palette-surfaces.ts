import type {
  AlertDialogColors,
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

// Button `colors` (ButtonColors): the filled button, on primary.
export function filledButtonColors(roles: MaterialRoles): ButtonColors {
  return {
    containerColor: roles.primary,
    contentColor: roles.onPrimary,
    disabledContainerColor: roles.disabledContainer,
    disabledContentColor: roles.disabledContent,
  };
}

// FilledTonalButton `colors` (ButtonColors): the muted fill.
export function tonalButtonColors(roles: MaterialRoles): ButtonColors {
  return {
    containerColor: roles.secondaryContainer,
    contentColor: roles.onSecondaryContainer,
    disabledContainerColor: roles.disabledContainer,
    disabledContentColor: roles.disabledContent,
  };
}

// OutlinedButton and TextButton `colors` (ButtonColors): primary content and no fill.
export function bareButtonColors(roles: MaterialRoles): ButtonColors {
  return {
    contentColor: roles.primary,
    disabledContentColor: roles.disabledContent,
  };
}

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

// AlertDialog `colors` (AlertDialogColors).
export function dialogColors(roles: MaterialRoles): AlertDialogColors {
  return {
    containerColor: roles.surfaceContainer,
    titleContentColor: roles.onSurface,
    textContentColor: roles.onSurfaceVariant,
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
