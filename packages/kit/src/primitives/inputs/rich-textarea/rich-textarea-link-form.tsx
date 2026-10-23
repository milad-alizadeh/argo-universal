import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { TextInput } from '#primitives/inputs/text-input';

export interface LinkFields {
  text: string;
  url: string;
}

interface LinkFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSubmitEditing: () => void;
}

const urlInput = {
  variant: 'bare',
  autoCapitalize: 'none',
  autoCorrect: false,
  tone: 'muted',
} as const;

function LinkField({ label, ...input }: LinkFieldProps): React.JSX.Element {
  return (
    <View className="gap-1">
      <Text aria-hidden role="secondary" className="text-muted-foreground">
        {label}
      </Text>
      <TextInput {...input} {...urlInput} accessibilityLabel={label} />
    </View>
  );
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

  const field = (label: string, key: keyof LinkFields): LinkFieldProps => ({
    label,
    value: fields[key],
    onChangeText: (value) => setFields({ ...fields, [key]: value }),
    onSubmitEditing: save,
  });

  return { field, save };
}

// The link editor's Text and Link fields, with Cancel and Save.
export function LinkForm(props: LinkFormProps): React.JSX.Element {
  const { field, save } = useLinkFields(props);

  return (
    <>
      <LinkField {...field('Text', 'text')} />
      <LinkField {...field('Link', 'url')} />
      <LinkActions onSave={save} onCancel={props.onCancel} />
    </>
  );
}
