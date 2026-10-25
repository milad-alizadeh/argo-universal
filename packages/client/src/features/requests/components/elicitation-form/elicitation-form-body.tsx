import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import type { ElicitationFieldProps } from './elicitation-field-props';
import type { ElicitationValue } from './elicitation-schema';

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

// One schema property bound to the form; the caller draws its rows.
export function ElicitationFormField(
  props: FormFieldProps & {
    children: (field: ElicitationFieldProps) => ReactElement;
  },
): ReactElement {
  const Field = props.model.form.Field;

  return (
    <Field
      name={props.entry.key}
      validators={{ onMount: () => mountedFieldError(props) }}
    >
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

// Virtualized fields can mount after the form's initial validation has run.
function mountedFieldError({
  model,
  entry,
}: FormFieldProps): string | undefined {
  return model.schema.validate({ value: model.form.state.values })?.fields[
    entry.key
  ];
}
