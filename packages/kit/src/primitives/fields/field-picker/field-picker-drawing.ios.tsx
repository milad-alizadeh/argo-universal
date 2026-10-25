import type { ReactElement } from 'react';
import { OptionRow } from './field-picker-inline-row.ios';
import type { PickerDrawing } from './field-picker-kind';
import { MenuPicker, MultipleMenu } from './field-picker-menu.ios';
import type { PickerProps } from './field-picker-model';
import { ScreenRow } from './field-picker-screen-row.ios';

// A `menu` opens in place: SwiftUI's menu Picker, or a Menu of checked items for a `multiple` choice.
function InPlace(props: PickerProps): ReactElement {
  return props.multiple ? (
    <MultipleMenu {...props} />
  ) : (
    <MenuPicker {...props} />
  );
}

/*
 * A `page` opens its page as SwiftUI's `.navigationLink` Picker does (ScreenRow), and an `inline` choice is the
 * options as rows of the Form's Section, a check row each (SwiftUI's inline Picker drew them blank).
 */
export const pickerDrawing: PickerDrawing = {
  Row: ScreenRow,
  Menu: InPlace,
  OptionRow,
  menuHoldsMultiple: true,
};
