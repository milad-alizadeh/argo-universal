import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import {
  ElicitationField,
  type ElicitationFieldProps,
} from './elicitation-field';
import type { ElicitationValue } from './elicitation-schema';

// In a phone's sheet the sheet's own title is the message, so only the source stays.
export function ElicitationHeading(props: {
  source?: string;
  message: string;
}): ReactElement | null {
  if (useOptionalSheet()) return <ElicitationSource source={props.source} />;

  return (
    <View className="gap-1">
      <ElicitationSource source={props.source} />
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        {props.message}
      </Text>
    </View>
  );
}

function ElicitationSource({
  source,
}: {
  source?: string;
}): ReactElement | null {
  return source ? <Text role="secondary">{source} asks</Text> : null;
}

export function ElicitationFields({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <View className="gap-4">
      {model.schema.fields.map((entry) => (
        <ElicitationFormField key={entry.key} model={model} entry={entry}>
          {(field) => <ElicitationField {...field} />}
        </ElicitationFormField>
      ))}
    </View>
  );
}

export type ElicitationEntry = ElicitationModel['schema']['fields'][number];

type FormFieldProps = {
  model: ElicitationModel;
  entry: ElicitationEntry;
};

type FieldBinding = {
  state: {
    value: ElicitationValue | undefined;
    meta: { errors: (string | undefined)[]; isTouched: boolean };
  };
  handleChange: (value: ElicitationValue) => void;
  handleBlur: () => void;
};

// One schema property bound to the form; the caller draws it, as a stacked field or a grouped row.
export function ElicitationFormField(
  props: FormFieldProps & {
    children: (field: ElicitationFieldProps) => ReactElement;
  },
): ReactElement {
  const Field = props.model.form.Field;

  return (
    <Field name={props.entry.key}>
      {(field) => props.children(boundProps({ ...props, field }))}
    </Field>
  );
}

function boundProps(
  props: FormFieldProps & { field: FieldBinding },
): ElicitationFieldProps {
  const { model, entry, field } = props;

  return {
    name: entry.name,
    property: entry.property,
    required: entry.required,
    ...bindingProps(field),
    showError: field.state.meta.isTouched || hasInitialValue(props),
    inactive: model.inactive,
  };
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

// A value the person did not type, such as the Agent's own, is checked from the start.
export function hasInitialValue({ model, entry }: FormFieldProps): boolean {
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
      accessibilityRole="alert"
      role="secondary"
      className="px-4 pt-3 text-danger"
    >
      Fix {props.labels.join(', ')} to submit
    </Text>
  );
}
