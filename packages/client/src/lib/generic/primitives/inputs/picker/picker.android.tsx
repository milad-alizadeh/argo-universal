import { AndroidPickerDialog } from './picker-dialog.android';
import { createNativePicker, type PickerPresentation } from './picker-native';
import type { PickerProps } from './picker-props';
import { AndroidPickerRow } from './picker-row.android';

export const Picker = createNativePicker(PickerControls);

function PickerControls<Value extends string>(
  props: PickerProps<Value> & PickerPresentation,
): React.JSX.Element {
  return (
    <>
      <AndroidPickerRow {...props} />
      {props.open && <AndroidPickerDialog {...props} />}
    </>
  );
}
