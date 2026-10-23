import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { FieldGroup } from '#primitives/fields/field-group';

export interface LinkFields {
  text: string;
  url: string;
}

interface LinkFieldProps {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

function LinkActions({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-row justify-end gap-2 pt-1">
      <Button label="Cancel" variant="text" size="sm" onPress={onCancel} />
      <Button label="Save" size="sm" onPress={onSave} />
    </View>
  );
}

interface LinkFormProps {
  initial: LinkFields;
  onSave: (fields: LinkFields) => void;
  onCancel: () => void;
}

interface LinkFieldsState {
  field: (label: string, key: keyof LinkFields) => LinkFieldProps;
  save: () => void;
}

// Each field's props; Return in either field saves.
function useLinkFields({
  initial,
  onSave,
}: Pick<LinkFormProps, 'initial' | 'onSave'>): LinkFieldsState {
  const [fields, setFields] = useState(initial);
  const save = (): void => onSave(fields);

  const field = (title: string, key: keyof LinkFields): LinkFieldProps => ({
    title,
    value: fields[key],
    onChangeText: (value) => setFields({ ...fields, [key]: value }),
    onSubmit: save,
  });

  return { field, save };
}

// A FieldGroup fills its page, so its two rows are given the height of a section of two.
const fieldsHeight = 'h-36';

// The link editor's Text and Link fields, with Cancel and Save.
export function LinkForm(props: LinkFormProps): React.JSX.Element {
  const { field, save } = useLinkFields(props);

  return (
    <>
      <View className={fieldsHeight}>
        <FieldGroup>
          <FieldGroup.Section>{linkRows(field)}</FieldGroup.Section>
        </FieldGroup>
      </View>
      <LinkActions onSave={save} onCancel={props.onCancel} />
    </>
  );
}

const linkRows = (
  field: (title: string, key: keyof LinkFields) => LinkFieldProps,
): React.JSX.Element[] => [
  <FieldGroup.TextField key="text" {...field('Text', 'text')} />,
  <FieldGroup.TextField
    key="url"
    {...field('Link', 'url')}
    keyboardType="url"
  />,
];
