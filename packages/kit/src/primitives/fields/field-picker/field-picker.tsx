import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { RowTitle } from '#primitives/fields/field-row';
import { PlainPicker, type PlainPickerProps } from '#primitives/inputs/picker';
import { FieldPickerDrill } from './field-picker-drill';
import {
  choiceSummary,
  widened,
  type FieldPickerCallerProps,
  type FieldPickerProps,
} from './field-picker-model';
import { PageTrigger } from './field-picker-page-trigger';

/*
 * The title, a flexible Spacer, then the choice at the row's end. A `menu` of one value is the kit's borderless
 * select; a `page`, or any `multiple` choice, which a select cannot hold, opens the page's popover. Expo UI's web
 * Picker draws a bordered box it takes no style for.
 */
export function FieldPicker(props: FieldPickerCallerProps): ReactElement;
export function FieldPicker(props: FieldPickerProps): ReactElement;
export function FieldPicker(
  caller: FieldPickerCallerProps | FieldPickerProps,
): ReactElement {
  const props = widened(caller);

  return (
    <Row alignment="center">
      <RowTitle {...props} />
      <Spacer flexible />
      <View className={chevronEnd}>
        <Choice {...props} />
      </View>
    </Row>
  );
}

function Choice(props: FieldPickerProps): ReactElement {
  if (props.presentation === 'menu' && !props.multiple)
    return <PlainPicker {...plainPickerProps(props)} />;

  return <PagePicker {...props} />;
}

function PagePicker(props: FieldPickerProps): ReactElement {
  return (
    <FieldPickerDrill
      {...props}
      trigger={
        <PageTrigger
          title={props.title}
          summary={choiceSummary(props)}
          disabled={props.disabled}
        />
      }
    />
  );
}

/*
 * The up-down chevron's strokes end a third of its box short of the right edge; pulling the picker out by that much
 * lines the ink up with the values in the rows above (to the nearest quarter step).
 */
const chevronEnd = '-mr-1.5 wide:-mr-1.25';

const plainPickerProps = (props: FieldPickerProps): PlainPickerProps => ({
  label: props.title,
  value: typeof props.value === 'string' ? props.value : '',
  options: props.options,
  onValueChange: props.onValueChange,
  disabled: props.disabled,
});
