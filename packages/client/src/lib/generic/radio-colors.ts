import type { RadioButton } from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import { useNativeTheme } from './native-theme';

// A Material RadioButton's colours from the theme's tokens: the accent when chosen.
export function useRadioColors(): ComponentProps<typeof RadioButton>['colors'] {
  const { colors } = useNativeTheme();

  return {
    selectedColor: colors.accent,
    unselectedColor: colors.mutedForeground,
    disabledSelectedColor: colors.disabledContent,
    disabledUnselectedColor: colors.disabledContent,
  };
}
