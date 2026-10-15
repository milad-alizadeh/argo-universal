// Android only: Expo UI has no universal radio button, so the single-choice mark stays Material's own.
import { RadioButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { RadioMarkProps } from './checkbox-radio';

// No onClick: the row around the mark owns the press and the selected semantics.
export function RadioMark(props: RadioMarkProps): React.JSX.Element {
  return (
    <RadioButton
      selected={props.selected}
      colors={useRadioColors()}
      enabled={!props.disabled}
      modifiers={props.modifiers}
    />
  );
}

function useRadioColors(): React.ComponentProps<typeof RadioButton>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    selectedColor: colors.foreground,
    unselectedColor: colors.mutedForeground,
    disabledSelectedColor: colors.disabledContent,
    disabledUnselectedColor: colors.disabledContent,
  };
}
