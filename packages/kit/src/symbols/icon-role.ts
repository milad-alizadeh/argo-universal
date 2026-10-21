import { iconRoles, type IconRole } from '@repo/contracts/kit-symbols';
import type { ViewStyle } from 'react-native';
import {
  type SizeClassValue,
  sizeClassValue,
} from '../use-size-class/size-class-value';
import { useSizeClass } from '../use-size-class/use-size-class';
import { useWide } from '../use-wide/use-wide';

export type { IconRole } from '@repo/contracts/kit-symbols';

// A role, or one per size class when the icon's place changes with the window.
export type IconRoleValue = SizeClassValue<IconRole>;

export function useIconPixels(role: IconRoleValue): number {
  const scale = useWide() ? 'wide' : 'phone';

  return iconRoles[sizeClassValue(role, useSizeClass())][scale];
}

export function useIconBox(
  role: IconRoleValue,
): Pick<ViewStyle, 'width' | 'height'> {
  const pixels = useIconPixels(role);

  return { width: pixels, height: pixels };
}
