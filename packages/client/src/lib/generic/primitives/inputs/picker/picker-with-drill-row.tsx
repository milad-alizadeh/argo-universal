import type * as React from 'react';
import { useSheetNavigation } from '#primitives/overlays/bottom-sheet';
import { PickerDrillRow } from './picker-drill-row';
import type { PickerProps } from './picker-props';

type NativePicker = <Value extends string>(
  props: PickerProps<Value>,
) => React.JSX.Element;

/*
 * A phone Picker whose `row` variant drills into a page of the sheet it sits in. Outside such a
 * sheet the row is the plain Picker.
 */
export function withDrillRow(Base: NativePicker): NativePicker {
  return function Picker<Value extends string>(
    props: PickerProps<Value>,
  ): React.JSX.Element {
    const navigation = useSheetNavigation();

    if (props.variant === 'row' && navigation)
      return <PickerDrillRow {...props} />;

    return <Base {...props} variant="field" />;
  };
}
