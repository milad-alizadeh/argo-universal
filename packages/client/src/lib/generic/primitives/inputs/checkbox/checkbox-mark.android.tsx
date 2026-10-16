// Android only: the universal Checkbox requires an action; decorative marks must have none.
import { Checkbox } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import type { CheckboxIndicatorProps } from './checkbox-props';
import { RadioMark } from './checkbox-radio';

const optionMarkPixels = 18;

const optionModifiers = [size(optionMarkPixels, optionMarkPixels)];

export function CheckboxMark(props: CheckboxIndicatorProps): React.JSX.Element {
  const modifiers = props.variant === 'option' ? optionModifiers : [];

  if (props.selection === 'single')
    return createElement(RadioMark, {
      selected: props.value,
      disabled: props.disabled,
      modifiers,
    });

  return createElement(Checkbox, {
    value: props.value,
    enabled: !props.disabled,
    modifiers,
  });
}
