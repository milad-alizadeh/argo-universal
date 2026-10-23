import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
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
      <View className={chevronEnd}>
        <PlainPicker {...plainPickerProps(props)} />
      </View>
    </Row>
  );
}

/*
 * The up-down chevron's strokes end a third of its box short of the right edge; pulling the picker out by that much
 * lines the ink up with the values in the rows above (to the nearest quarter step).
 */
const chevronEnd = '-mr-1.5 wide:-mr-1.25';

const plainPickerProps = (props: FieldPickerProps): PlainPickerProps => ({
  label: props.title,
  value: props.value,
  options: props.options,
  onValueChange: props.onValueChange,
  disabled: props.disabled,
});
