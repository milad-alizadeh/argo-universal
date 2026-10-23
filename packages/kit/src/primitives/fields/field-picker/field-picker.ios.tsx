import type { ReactElement } from 'react';
import { InlineChecks } from './field-picker-inline.ios';
import { MenuPicker, MultipleMenu } from './field-picker-menu.ios';
import type {
  FieldPickerCallerProps,
  FieldPickerProps,
} from './field-picker-model';
import { NativePicker } from './field-picker-native';
import { ScreenRow } from './field-picker-screen-row.ios';

/*
 * A `menu` opens in place: SwiftUI's menu Picker, or a Menu of checked items for a `multiple` choice. A `page`
 * opens its page as SwiftUI's `.navigationLink` Picker does (see NativePicker).
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  return (
    <NativePicker
      caller={caller}
      menu={InPlace}
      row={ScreenRow}
      inline={Inline}
    />
  );
}

// An `inline` choice is the options as rows of the Form's Section, a check row each (SwiftUI's inline Picker drew them blank).
function Inline(props: FieldPickerProps): ReactElement {
  return <InlineChecks {...props} />;
}

function InPlace(props: FieldPickerProps): ReactElement {
  return props.multiple ? (
    <MultipleMenu {...props} />
  ) : (
    <MenuPicker {...props} />
  );
}
