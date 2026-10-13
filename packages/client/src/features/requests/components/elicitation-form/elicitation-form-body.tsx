import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';
import { ElicitationField } from './elicitation-field';

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

function FormField({ model, entry }: FormFieldProps): ReactElement {
  const Field = model.form.Field;
  return (
    <Field name={entry.key}>
      {(field) => (
        <ElicitationField
          name={entry.name}
          property={entry.property}
          required={entry.required}
          value={field.state.value}
          error={field.state.meta.errors[0]}
          showError={
            field.state.meta.isTouched ||
            hasInitialValue(
              model.props.initialValues,
              entry.name,
              entry.property.default !== undefined,
            )
          }
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          inactive={model.inactive}
        />
      )}
    </Field>
  );
}

function hasInitialValue(
  values: ElicitationModel['props']['initialValues'],
  name: string,
  hasDefault: boolean,
): boolean {
  return values?.[name] !== undefined || hasDefault;
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
