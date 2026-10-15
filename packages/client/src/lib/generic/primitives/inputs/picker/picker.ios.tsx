import type { ComponentType } from 'react';
import { PickerDrillIn } from './picker-drill-in.ios';
import { NativeMenuPicker, NativePickerRow } from './picker-menu.ios';
import { createNativePicker, type PickerPresentation } from './picker-native';
import type { PickerProps } from './picker-props';

const menuLimit = 7;

type ControlProps<Value extends string> = PickerProps<Value> &
  PickerPresentation;

export const Picker = createNativePicker(PickerControl) satisfies ComponentType<
  PickerProps<string>
>;

function PickerControl<Value extends string>(
  props: ControlProps<Value>,
): React.JSX.Element {
  return (
    <>
      <PickerRow {...props} />
      <PickerDrillIn {...props} />
    </>
  );
}

function PickerRow<Value extends string>(
  props: ControlProps<Value>,
): React.JSX.Element {
  return props.options.length > menuLimit ? (
    <NativePickerRow {...props} />
  ) : (
    <NativeMenuPicker {...props} />
  );
}
