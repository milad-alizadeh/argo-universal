import { useInListItem } from '../../lists/list-item/list-item-accessory';
import { AndroidPickerDialog } from './picker-dialog.android';
import {
  createNativePicker,
  fieldHostSizing,
  type PickerHostSizing,
  type PickerPresentation,
} from './picker-native';
import type { PickerProps } from './picker-props';
import { AndroidPickerRow } from './picker-row.android';

export const Picker = createNativePicker({
  Control: PickerControls,
  useHostSizing,
});

/*
 * In a ListItem's trailing slot the Picker sizes to its value: the slot's host
 * takes its content's measured width, so a full-width Picker left the row's
 * title no room and wrapped it a letter per line.
 */
function useHostSizing(): PickerHostSizing {
  return useInListItem() ? { matchContents: true } : fieldHostSizing;
}

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
