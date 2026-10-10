import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { RemoveEntryButton } from './entry-controls';
import {
  FieldMessage,
  FormInput,
  type TextField,
  fieldInput,
} from './form-field';
import type { CustomAgentFormApi } from './use-custom-agent-form';

type RowProps = { form: CustomAgentFormApi; disabled: boolean; index: number };
type InputProps = { item: TextField; index: number; disabled: boolean };

export function VariableColumns(): React.JSX.Element {
  return (
    <View className="flex-row gap-2 pr-11">
      <Text className="type-secondary w-50">Name</Text>
      <Text className="type-secondary flex-1">Value</Text>
    </View>
  );
}

export function VariableInputRow(props: RowProps): React.JSX.Element {
  const { form, disabled, index } = props;
  return (
    <View className="flex-row items-start gap-2">
      <NameInput {...props} />
      <ValueInput {...props} />
      <RemoveEntryButton
        label={`Remove variable ${index + 1}`}
        disabled={disabled}
        onPress={() => void form.removeFieldValue('env', index)}
      />
    </View>
  );
}

function NameInput(props: RowProps): React.JSX.Element {
  return (
    <props.form.Field name={`env[${props.index}].name`}>
      {(item) => <NameInputField {...props} item={item} />}
    </props.form.Field>
  );
}

function NameInputField(props: InputProps): React.JSX.Element {
  return (
    <View className="w-50 gap-1">
      <FormInput
        mono
        label={`Variable ${props.index + 1} name`}
        {...fieldInput(props.item)}
        disabled={props.disabled}
      />
      <FieldMessage errors={props.item.state.meta.errors} />
    </View>
  );
}

function ValueInput(props: RowProps): React.JSX.Element {
  return (
    <props.form.Field name={`env[${props.index}].value`}>
      {(item) => <ValueTextInput {...props} item={item} />}
    </props.form.Field>
  );
}

function ValueTextInput(props: InputProps): React.JSX.Element {
  const { item } = props;
  return (
    <FormInput
      mono
      className="flex-1"
      label={`Variable ${props.index + 1} value`}
      value={item.state.value}
      onChange={item.handleChange}
      errors={item.state.meta.errors}
      disabled={props.disabled}
    />
  );
}
