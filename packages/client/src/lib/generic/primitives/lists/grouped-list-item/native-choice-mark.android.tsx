import { RadioButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListItemProps } from './grouped-list-item-props';

// A choice row's Material RadioButton; the row takes the press, so the button only shows the state.
export function ChoiceRadio(
  props: Pick<GroupedListItemProps, 'selected' | 'disabled'>,
): React.JSX.Element {
  return (
    <RadioButton
      selected={!!props.selected}
      enabled={!props.disabled}
      colors={useRadioColors()}
    />
  );
}

function useRadioColors(): React.ComponentProps<typeof RadioButton>['colors'] {
  const { colors } = useNativeTheme();

  return {
    selectedColor: colors.accent,
    unselectedColor: colors.mutedForeground,
    disabledSelectedColor: colors.disabledContent,
    disabledUnselectedColor: colors.disabledContent,
  };
}
