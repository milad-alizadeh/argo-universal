import type { ViewStyle } from 'react-native';
import { useWide } from '../use-wide/use-wide';

type IconPixels = 12 | 14 | 16 | 20 | 24;

// Where an icon sits decides its size. Text is a step larger on the phone, so an icon beside text steps up with it.
const iconRoles = {
  // Beside Body text.
  body: { wide: 16, phone: 20 },
  // Beside Secondary text.
  secondary: { wide: 12, phone: 16 },
  // Inside a control.
  control: { wide: 16, phone: 16 },
  // A shape that fills its whole box, one step inside a control's slot.
  mark: { wide: 14, phone: 14 },
  // A list row's leading icon.
  row: { wide: 20, phone: 24 },
  // A header or floating action.
  action: { wide: 20, phone: 20 },
  // Top-level navigation.
  nav: { wide: 24, phone: 24 },
  // A page title's Back.
  title: { wide: 24, phone: 24 },
} as const satisfies Record<string, Record<'wide' | 'phone', IconPixels>>;

export type IconRole = keyof typeof iconRoles;

export function useIconPixels(role: IconRole): number {
  return iconRoles[role][useWide() ? 'wide' : 'phone'];
}

export function useIconBox(
  role: IconRole,
): Pick<ViewStyle, 'width' | 'height'> {
  const pixels = useIconPixels(role);
  return { width: pixels, height: pixels };
}
