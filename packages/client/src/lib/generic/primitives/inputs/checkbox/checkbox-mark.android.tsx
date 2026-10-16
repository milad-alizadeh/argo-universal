// Android only: the universal Checkbox requires an action; decorative marks must have none.
import { Checkbox } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import { createElement } from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import type { CheckboxIndicatorProps } from './checkbox-props';
import { RadioMark } from './checkbox-radio';

const optionBoxPixels = 18;

// Material draws its radio circle at 20dp; a smaller box clips the ring.
const optionRadioPixels = 20;

const optionModifiers = [size(optionBoxPixels, optionBoxPixels)];

const radioModifiers = [size(optionRadioPixels, optionRadioPixels)];

const markModifiers = (
  props: CheckboxIndicatorProps,
): typeof optionModifiers => {
  if (props.variant !== 'option') return [];

  return props.selection === 'single' ? radioModifiers : optionModifiers;
};

export function CheckboxMark(props: CheckboxIndicatorProps): React.JSX.Element {
  const modifiers = markModifiers(props);

  if (props.selection === 'single')
    return createElement(RadioMark, {
      selected: props.value,
      disabled: props.disabled,
      modifiers,
    });

  return <BoxMark {...props} modifiers={modifiers} />;
}

function BoxMark(
  props: CheckboxIndicatorProps & { modifiers: typeof optionModifiers },
): React.JSX.Element {
  return createElement(Checkbox, {
    value: props.value,
    enabled: !props.disabled,
    colors: useMaterialPalette().checkboxColors,
    modifiers: props.modifiers,
  });
}
