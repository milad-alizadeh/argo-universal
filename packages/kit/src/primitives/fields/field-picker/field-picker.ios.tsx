import { Picker, Text } from '@expo/ui/swift-ui';
import { disabled, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

/*
 * SwiftUI's Picker with its own label and no wrapping row, so Form draws the stock row: the title at the leading
 * edge, the chosen value and the up-down chevrons at the trailing edge.
 */
export function FieldPicker(
  props: FieldGroupKitProps<'FieldGroup.Picker'>,
): ReactElement {
  return (
    <Picker
      label={plain(props) ? props.title : <RowTitle {...props} />}
      selection={props.value}
      onSelectionChange={(value: string) => props.onValueChange(value)}
      modifiers={[pickerStyle('menu'), disabled(props.disabled ?? false)]}
    >
      {options(props.options)}
    </Picker>
  );
}

const options = (
  list: FieldGroupKitProps<'FieldGroup.Picker'>['options'],
): ReactElement[] =>
  list.map((option) => (
    <Text key={option.value} modifiers={[tag(option.value)]}>
      {option.label}
    </Text>
  ));

// A title with no icon is the Picker's own string label.
const plain = (props: FieldGroupKitProps<'FieldGroup.Picker'>): boolean =>
  !props.leading;
