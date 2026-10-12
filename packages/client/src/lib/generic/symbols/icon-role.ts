import type { ViewStyle } from 'react-native';
import { useWide } from '../use-wide/use-wide';

type IconPixels = 12 | 14 | 16 | 20 | 24;

// Where an icon sits decides its size. Text is a step larger on the phone, so an icon beside text steps up with it.
const iconRoles = {
  // Beside Body text: Feed rows and carets, request cards, row and menu chevrons, Back inside a row.
  body: { wide: 16, phone: 20 },
  // Beside Secondary text: meta lines, Session row badges, pull request checks, status chevrons.
  secondary: { wide: 12, phone: 16 },
  // Inside a control: the Composer, buttons, chips and inputs.
  control: { wide: 16, phone: 16 },
  // 12 at every width: a tick inside a checkbox, a chip's remove cross, a status beside mono code.
  inset: { wide: 12, phone: 12 },
  // A shape that fills its whole box, such as an Agent logo or a selected tick, one step inside a 16 slot.
  mark: { wide: 14, phone: 14 },
  // A list row's leading icon.
  row: { wide: 20, phone: 24 },
  // Header buttons, the search lens and the floating action button.
  action: { wide: 20, phone: 20 },
  // The desktop rail, the phone drawer's sections and the tab bar.
  nav: { wide: 24, phone: 24 },
  // A page title's Back.
  title: { wide: 24, phone: 24 },
} as const satisfies Record<string, Record<'wide' | 'phone', IconPixels>>;

export type IconRole = keyof typeof iconRoles;

function isIconRole(name: string): name is IconRole {
  return Object.hasOwn(iconRoles, name);
}

export const iconRoleNames: readonly IconRole[] =
  Object.keys(iconRoles).filter(isIconRole);

export function useIconPixels(role: IconRole): number {
  return iconRoles[role][useWide() ? 'wide' : 'phone'];
}

export function useIconBox(
  role: IconRole,
): Pick<ViewStyle, 'width' | 'height'> {
  const pixels = useIconPixels(role);
  return { width: pixels, height: pixels };
}
