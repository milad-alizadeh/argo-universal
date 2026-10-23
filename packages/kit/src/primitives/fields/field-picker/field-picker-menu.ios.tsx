import { Menu, Picker, Text, Toggle } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import {
  choiceSummary,
  chosenValues,
  choose,
  type FieldPickerOption,
  type FieldPickerProps,
} from './field-picker-model';

const offModifiers = (
  props: FieldPickerProps,
): ReturnType<typeof disabled>[] => [disabled(props.disabled ?? false)];

/*
 * A `menu` of one value: SwiftUI's Picker with its own label and no wrapping row, so Form draws the stock row: the
 * title at the leading edge, the chosen value and the up-down chevrons at the trailing edge. A title with no icon
 * is the Picker's own string label.
 */
export function MenuPicker(props: FieldPickerProps): ReactElement {
  return (
    <Picker
      label={<RowTitle {...props} />}
      selection={chosenValues(props)[0] ?? ''}
      onSelectionChange={(value: string) => props.onValueChange(value)}
      modifiers={[pickerStyle('menu'), ...offModifiers(props)]}
    >
      {props.options.map(tagged)}
    </Picker>
  );
}

/*
 * A `multiple` menu: a Picker holds one tag, so the options are a Menu of checked items, each toggling its own
 * value. The Menu's label is the title and the chosen labels.
 */
export function MultipleMenu(props: FieldPickerProps): ReactElement {
  return (
    <Menu
      label={`${props.title}, ${choiceSummary(props)}`}
      modifiers={[buttonStyle('plain'), ...offModifiers(props)]}
    >
      {props.options.map((option) => (
        <Checked key={option.value} {...props} option={option} />
      ))}
    </Menu>
  );
}

const tagged = (option: FieldPickerOption): ReactElement => (
  <Text key={option.value} modifiers={[tag(option.value)]}>
    {option.label}
  </Text>
);

function Checked(
  props: FieldPickerProps & { option: FieldPickerOption },
): ReactElement {
  return (
    <Toggle
      label={props.option.label}
      isOn={chosenValues(props).includes(props.option.value)}
      onIsOnChange={() => choose(props, props.option.value)}
    />
  );
}
