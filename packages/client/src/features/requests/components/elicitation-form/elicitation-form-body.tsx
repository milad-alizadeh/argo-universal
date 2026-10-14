import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import {
  ElicitationField,
  type ElicitationFieldProps,
} from './elicitation-field';
import type { ElicitationValue } from './elicitation-schema';

export function ElicitationHeading(props: {
  source?: string;
  message: string;
}): ReactElement {
  return (
    <View className="gap-1">
      {props.source && <Text role="secondary">{props.source} asks</Text>}
      <Text role="heading" aria-level={2}>
        {props.message}
      </Text>
    </View>
  );
}

export function ElicitationFields({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <View className="gap-4">
      {model.schema.fields.map((entry) => (
        <FormField key={entry.key} model={model} entry={entry} />
      ))}
    </View>
  );
}

type FormFieldProps = {
  model: ElicitationModel;
  entry: ElicitationModel['schema']['fields'][number];
};

type FieldBinding = {
  state: {
    value: ElicitationValue | undefined;
    meta: { errors: (string | undefined)[]; isTouched: boolean };
  };
  handleChange: (value: ElicitationValue) => void;
  handleBlur: () => void;
};

function FormField({ model, entry }: FormFieldProps): ReactElement {
  const Field = model.form.Field;

  return (
    <Field name={entry.key}>
      {(field) => <BoundField model={model} entry={entry} field={field} />}
    </Field>
  );
}

function BoundField(
  props: FormFieldProps & { field: FieldBinding },
): ReactElement {
  const { model, entry, field } = props;

  return (
    <ElicitationField
      name={entry.name}
      property={entry.property}
      required={entry.required}
      {...bindingProps(field)}
      showError={field.state.meta.isTouched || hasInitialValue(props)}
      inactive={model.inactive}
    />
  );
}

function bindingProps(
  field: FieldBinding,
): Pick<ElicitationFieldProps, 'value' | 'error' | 'onChange' | 'onBlur'> {
  return {
    value: field.state.value,
    error: field.state.meta.errors[0],
    onChange: field.handleChange,
    onBlur: field.handleBlur,
  };
}

function hasInitialValue({ model, entry }: FormFieldProps): boolean {
  return (
    model.props.initialValues?.[entry.name] !== undefined ||
    entry.property.default !== undefined
  );
}

export function ElicitationValidation(props: {
  answered: boolean;
  labels: readonly string[];
}): ReactElement | null {
  if (props.answered || props.labels.length === 0) return null;

  return (
    <Text
      semanticRole="alert"
      role="secondary"
      className="px-4 pt-3 text-destructive"
    >
      Fix {props.labels.join(', ')} to submit
    </Text>
  );
}
