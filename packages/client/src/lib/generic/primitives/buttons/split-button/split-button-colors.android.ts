import type { ButtonColors } from '@expo/ui/jetpack-compose';
import type { NativeColors } from '#lib/generic/native-theme';

// Paper owns the colours: a primary split fills with the primary token, otherwise the muted one.
export function halfColors(
  colors: NativeColors,
  primary: boolean,
): ButtonColors {
  if (!primary)
    return { containerColor: colors.muted, contentColor: colors.foreground };

  return {
    containerColor: colors.primary,
    contentColor: colors.primaryForeground,
  };
}
