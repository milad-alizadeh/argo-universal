import type { ReactElement } from 'react';
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
import { ListItemFrame } from './list-item';

export type ListItemTextFieldProps = TextFieldProps & { description?: string };

export function ListItemTextField(props: ListItemTextFieldProps): ReactElement {
  const field = { ...props, hint: props.description ?? props.hint };

  return Platform.OS === 'android' ? (
    <StandaloneTextInput {...field} />
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
