import { useContext, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import {
  FooterProvider,
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import {
  StandaloneTextInput,
  RowTextInput,
  type TextFieldProps,
} from '#primitives/inputs/text-input';
import { ListContext } from '../../../list-context';
import { ListItemFrame } from './list-item';

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
  const description = useFieldDescription(props);

  const footer = {
    id: description.descriptionId ?? description.footerId,
    failure: description.invalid,
  };

  return (
    <>
      <FooterProvider value={footer}>
        <FieldEntry {...props} />
      </FooterProvider>
      <FieldFooter {...description} />
    </>
  );
}

function FieldFooter(props: FieldDescription): ReactElement | null {
  return props.footer ? (
    <View className="px-4 py-2 wide:px-5">
      <FieldDescriptionFooter {...props} />
    </View>
  ) : null;
}

function FieldEntry(props: TextFieldProps): ReactElement {
  return (
    <ListItemFrame
      title={props.label}
      disabled={props.disabled}
      content={<RowTextInput {...props} />}
    />
  );
}

function StackedField(props: TextFieldProps): ReactElement {
  const { position } = useContext(ListContext);
  const gap = ['first', 'middle'].includes(position) ? 'pb-4' : undefined;

  return (
    <View className={gap}>
      <StandaloneTextInput {...props} />
    </View>
  );
}
