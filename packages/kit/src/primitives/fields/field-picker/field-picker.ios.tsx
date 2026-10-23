import type { ReactElement } from 'react';
import { InlineChecks, InlinePicker } from './field-picker-inline.ios';
import { MenuPicker, MultipleMenu } from './field-picker-menu.ios';
import type {
  FieldPickerCallerProps,
  FieldPickerProps,
} from './field-picker-model';
import { NativePicker } from './field-picker-native';
import { PageRow } from './field-picker-page-row.ios';

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
      row={PageRow}
      inline={Inline}
    />
  );
}

// An `inline` choice is the options as rows of the Form's Section: SwiftUI's inline Picker, or a check row each.
function Inline(props: FieldPickerProps): ReactElement {
  return props.multiple ? (
    <InlineChecks {...props} />
  ) : (
    <InlinePicker {...props} />
  );
}

function InPlace(props: FieldPickerProps): ReactElement {
  return props.multiple ? (
    <MultipleMenu {...props} />
  ) : (
    <MenuPicker {...props} />
  );
}
