import { useMemo } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { type MaterialRoles, materialRoles } from './material-roles';
import * as inputs from './palette-inputs';
import * as surfaces from './palette-surfaces';

type Controls = {
  [Name in keyof typeof inputs | keyof typeof surfaces]: ReturnType<
    (typeof inputs & typeof surfaces)[Name]
  >;
};

type MaterialPalette = Omit<Controls, 'dialogButtonColors'> & {
  roles: MaterialRoles;
  dialogAnswerColors: Controls['dialogButtonColors'];
  dialogDangerColors: Controls['dialogButtonColors'];
};

/*
 * The one Android palette: every Compose control's `colors` from Argo's tokens. A single colour
 * prop (a menu's `color`, a spinner's `color`) reads its role from `roles`.
 */
export function useMaterialPalette(): MaterialPalette {
  const { colors } = useNativeTheme();

  return useMemo(() => palette(materialRoles(colors)), [colors]);
}

function palette(roles: MaterialRoles): MaterialPalette {
  return {
    roles,
    ...inputControls(roles),
    ...surfaceControls(roles),
    dialogAnswerColors: surfaces.dialogButtonColors(roles, false),
    dialogDangerColors: surfaces.dialogButtonColors(roles, true),
  };
}

function inputControls(
  roles: MaterialRoles,
): Pick<Controls, keyof typeof inputs> {
  return {
    switchColors: inputs.switchColors(roles),
    sliderColors: inputs.sliderColors(roles),
    radioColors: inputs.radioColors(roles),
    outlinedFieldColors: inputs.outlinedFieldColors(roles),
    filledFieldColors: inputs.filledFieldColors(roles),
  };
}

function surfaceControls(
  roles: MaterialRoles,
): Omit<Pick<Controls, keyof typeof surfaces>, 'dialogButtonColors'> {
  return {
    menuItemColors: surfaces.menuItemColors(roles),
    chipColors: surfaces.chipColors(roles),
    listItemColors: surfaces.listItemColors(roles),
    cardColors: surfaces.cardColors(roles),
    ripple: surfaces.ripple(roles),
  };
}
