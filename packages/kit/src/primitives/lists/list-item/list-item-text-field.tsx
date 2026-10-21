import { useContext, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import {
  StandaloneTextInput,
  RowTextInput,
  type TextFieldProps,
} from '#primitives/inputs/text-input';
import { ListContext } from '../../../list-context';
import { ListItemFieldRow } from './list-item-field-row';

export type ListItemTextFieldProps = TextFieldProps & { description?: string };

export function ListItemTextField(props: ListItemTextFieldProps): ReactElement {
  const field = { ...props, hint: props.description ?? props.hint };

  return Platform.OS === 'android' ? (
    <StackedField {...field} />
  ) : (
    <FieldRow {...field} />
  );
}

function FieldRow(props: TextFieldProps): ReactElement {
  return (
    <ListItemFieldRow {...props}>
      <RowTextInput {...props} />
    </ListItemFieldRow>
  );
}

function StackedField(props: TextFieldProps): ReactElement {
  const { position } = useContext(ListContext);
  const gap = ['first', 'middle'].includes(position) ? 'pb-4' : undefined;

  return (
    <View className={gap}>
      <View className="min-h-14">
        <StandaloneTextInput {...props} />
      </View>
    </View>
  );
}
