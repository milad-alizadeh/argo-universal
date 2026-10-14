import { RadioButton } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useRadioColors } from '../../../radio-colors';
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
