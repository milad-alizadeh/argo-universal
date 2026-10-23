import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import { PlainPicker, type PlainPickerProps } from '#primitives/inputs/picker';
import type { FieldGroupKitProps } from '../../kit-props';

type FieldPickerProps = FieldGroupKitProps<'FieldGroup.Picker'>;

/*
 * The title, a flexible Spacer, then the kit's borderless select, as iOS's menu Picker ends a row. Expo UI's web
 * Picker draws a bordered box it takes no style for.
 */
export function FieldPicker(props: FieldPickerProps): ReactElement {
  return (
    <Row alignment="center">
      <RowTitle {...props} />
      <Spacer flexible />
      <PlainPicker {...plainPickerProps(props)} />
    </Row>
  );
}

const plainPickerProps = (props: FieldPickerProps): PlainPickerProps => ({
  label: props.title,
  value: props.value,
  options: props.options,
  onValueChange: props.onValueChange,
  disabled: props.disabled,
});
