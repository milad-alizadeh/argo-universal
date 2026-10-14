import {
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type ReactFormExtendedApi,
  useForm,
  useStore,
} from '@tanstack/react-form';
import { useMemo } from 'react';
import type {
  ElicitationAnswer,
  ElicitationFormProps,
} from '../components/elicitation-form/elicitation-form-props';
import { createElicitationSchema } from '../components/elicitation-form/elicitation-schema';

type Schema = ReturnType<typeof createElicitationSchema>;

type Values = ReturnType<Schema['defaultValues']>;

type Validate = Schema['validate'];

type Sync = FormValidateOrFn<Values> | undefined;

type Async = FormAsyncValidateOrFn<Values> | undefined;

type Form = ReactFormExtendedApi<
  Values,
  Validate,
  Validate,
  Async,
  Sync,
  Async,
  Validate,
  Async,
  Sync,
  Async,
  Async,
  unknown
>;

type Fields = { schema: Schema; form: Form };

type Status = {
  isValid: boolean;
  submitting: boolean;
  inactive: boolean;
  invalid: string[];
  state: ElicitationFormProps['state'];
};

export type ElicitationModel = Fields &
  Status & {
    props: ElicitationFormProps;
    error?: string;
    answer: (action: ElicitationAnswer['action']) => void;
  };

function useElicitationFields(props: ElicitationFormProps): Fields {
  const schema = useMemo(
    () => createElicitationSchema(props.request.requestedSchema),
    [props.request.requestedSchema],
  );

  const form = useForm(formOptions(schema, props));

  return { schema, form };
}

function formOptions(
  schema: Schema,
  props: ElicitationFormProps,
): Form['options'] {
  return {
    defaultValues: schema.defaultValues(props.initialValues ?? {}),
    validators: {
      onMount: schema.validate,
      onChange: schema.validate,
      onSubmit: schema.validate,
    },
    onSubmit: ({ value }): void =>
      props.onAnswer({ action: 'accept', content: schema.content(value) }),
  };
}

function useValidation(fields: Fields): Pick<Status, 'isValid' | 'invalid'> {
  const metadata = useStore(fields.form.store, (state) => state.fieldMeta);
  const isValid = useStore(fields.form.store, (state) => state.isValid);

  const invalid = fields.schema.fields
    .filter(({ key }) => metadata[key]?.errors.length)
    .map(({ name, property }) => property.title ?? name);

  return { isValid, invalid };
}

function useActivity(
  fields: Fields,
  props: ElicitationFormProps,
): Pick<Status, 'submitting' | 'inactive' | 'state'> {
  const isSubmitting = useStore(
    fields.form.store,
    (state) => state.isSubmitting,
  );

  const submitting = props.state.kind === 'submitting' || isSubmitting;

  return {
    submitting,
    inactive: submitting || props.state.kind === 'answered',
    state: effectiveState(props.state, isSubmitting),
  };
}

function effectiveState(
  state: ElicitationFormProps['state'],
  submitting: boolean,
): ElicitationFormProps['state'] {
  return submitting && state.kind === 'open' ? { kind: 'submitting' } : state;
}

export function useElicitationForm(
  props: ElicitationFormProps,
): ElicitationModel {
  const fields = useElicitationFields(props);

  const model = {
    ...fields,
    ...useValidation(fields),
    ...useActivity(fields, props),
    props,
    error: props.error ?? fields.schema.error,
  };

  return { ...model, answer: (action): void => answerRequest(model, action) };
}

function answerRequest(
  model: Omit<ElicitationModel, 'answer'>,
  action: ElicitationAnswer['action'],
): void {
  if (model.inactive) return;

  if (action === 'accept') void model.form.handleSubmit();
  else model.props.onAnswer({ action });
}
