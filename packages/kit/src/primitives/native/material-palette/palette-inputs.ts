import type {
  RadioButtonColors,
  SliderColors,
  SwitchColors,
  TextFieldColors,
} from '@expo/ui/jetpack-compose';
import type { MaterialRoles } from './material-roles';

// Switch `colors` (SwitchColors): the accent track while on, a muted track and outline while off.
export function switchColors(roles: MaterialRoles): SwitchColors {
  return {
    checkedTrackColor: roles.accent,
    checkedThumbColor: roles.surfaceContainer,
    checkedBorderColor: roles.accent,
    uncheckedTrackColor: roles.secondaryContainer,
    uncheckedThumbColor: roles.outline,
    uncheckedBorderColor: roles.outline,
    ...disabledSwitchColors(roles),
  };
}

function disabledSwitchColors(roles: MaterialRoles): SwitchColors {
  return {
    disabledCheckedTrackColor: roles.disabledContainer,
    disabledCheckedThumbColor: roles.surface,
    disabledCheckedBorderColor: roles.disabledContainer,
    disabledUncheckedTrackColor: roles.disabledContainer,
    disabledUncheckedThumbColor: roles.disabledContent,
    disabledUncheckedBorderColor: roles.disabledContent,
  };
}

// Slider `colors` (SliderColors).
export function sliderColors(roles: MaterialRoles): SliderColors {
  return {
    thumbColor: roles.primary,
    activeTrackColor: roles.primary,
    inactiveTrackColor: roles.outlineVariant,
    activeTickColor: roles.onPrimary,
    inactiveTickColor: roles.primary,
  };
}

// RadioButton `colors` (RadioButtonColors).
export function radioColors(roles: MaterialRoles): RadioButtonColors {
  return {
    selectedColor: roles.onSurface,
    unselectedColor: roles.onSurfaceVariant,
    disabledSelectedColor: roles.disabledContent,
    disabledUnselectedColor: roles.disabledContent,
  };
}

// OutlinedTextField `colors` (TextFieldColors): only the outline, focus and error; the rest stays Material's.
export function outlinedFieldColors(roles: MaterialRoles): TextFieldColors {
  return {
    unfocusedIndicatorColor: roles.outlineVariant,
    disabledIndicatorColor: roles.outlineVariant,
    focusedIndicatorColor: roles.accent,
    cursorColor: roles.accent,
    focusedLabelColor: roles.accent,
    ...fieldErrorColors(roles),
  };
}

// TextField `colors` (TextFieldColors) for the filled field: a muted container under the outline's focus.
export function filledFieldColors(roles: MaterialRoles): TextFieldColors {
  return {
    ...outlinedFieldColors(roles),
    focusedContainerColor: roles.secondaryContainer,
    unfocusedContainerColor: roles.secondaryContainer,
    disabledContainerColor: roles.secondaryContainer,
    errorContainerColor: roles.secondaryContainer,
    focusedTextColor: roles.onSurface,
    unfocusedTextColor: roles.onSurface,
    disabledTextColor: roles.disabledContent,
    unfocusedLabelColor: roles.onSurfaceVariant,
    focusedTrailingIconColor: roles.onSurfaceVariant,
    unfocusedTrailingIconColor: roles.onSurfaceVariant,
  };
}

function fieldErrorColors(roles: MaterialRoles): TextFieldColors {
  return {
    errorIndicatorColor: roles.error,
    errorCursorColor: roles.error,
    errorLabelColor: roles.error,
    errorSupportingTextColor: roles.error,
  };
}
