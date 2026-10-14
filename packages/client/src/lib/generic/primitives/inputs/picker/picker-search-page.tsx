import type * as React from 'react';
import { ComboboxContent } from './combobox-content';
import type { PickerProps } from './picker-props';
import { choosePickerOption } from './picker-selection';

// A long Picker's options on a page of their own, with the Combobox's search over them.
export function PickerSearchPage<Value extends string>(
  props: PickerProps<Value> & { onClose: () => void },
): React.JSX.Element {
  return (
    <ComboboxContent
      {...props}
      wide={false}
      onChoose={(value) => {
        choosePickerOption(props, value);
        props.onClose();
      }}
    />
  );
}
