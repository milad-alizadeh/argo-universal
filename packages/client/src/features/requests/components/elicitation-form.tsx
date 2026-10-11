import type {
  PendingElicitation,
  SessionAnswerElicitationInput,
} from '@repo/contracts';
import { useForm, useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';
import { ElicitationField } from './elicitation-field';
import {
  createElicitationSchema,
  type ElicitationValues,
} from './elicitation-schema';
import { RequestAction, RequestCard, type RequestState } from './request-card';

export type { ElicitationValues } from './elicitation-schema';
export type ElicitationAnswer = Pick<
  SessionAnswerElicitationInput,
  'action' | 'content'
>;
export interface ElicitationFormProps {
  request: PendingElicitation;
  initialValues?: ElicitationValues;
  onAnswer: (answer: ElicitationAnswer) => void;
  source?: string;
  state: RequestState;
  error?: string;
}

export function ElicitationForm(
  props: ElicitationFormProps,
): React.JSX.Element {
  return <RequestForm key={props.request.requestId} {...props} />;
}

function RequestForm({
  request,
  initialValues = {},
  onAnswer,
  source,
  state,
  error: responseError,
}: ElicitationFormProps): React.JSX.Element {
  const submitting = state.kind === 'submitting';
  const alreadyAnswered = state.kind === 'answered';
  const schema = useMemo(
    () => createElicitationSchema(request.requestedSchema),
    [request.requestedSchema],
  );
  const error = responseError ?? schema.error;
  const form = useForm({
    defaultValues: schema.defaultValues(initialValues),
    validators: {
      onMount: schema.validate,
      onChange: schema.validate,
      onSubmit: schema.validate,
    },
    onSubmit: ({ value }) =>
      onAnswer({ action: 'accept', content: schema.content(value) }),
  });
  const fieldMetadata = useStore(form.store, (state) => state.fieldMeta);
  const isValid = useStore(form.store, (state) => state.isValid);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const inactive = submitting || isSubmitting || alreadyAnswered;
  const invalid = schema.fields.filter(
    ({ key }) => fieldMetadata[key]?.errors.length,
  );
  const answer = (action: ElicitationAnswer['action']): void => {
    if (inactive) return;
    if (action === 'accept') void form.handleSubmit();
    else onAnswer({ action });
  };
  return (
    <RequestCard
      state={
        isSubmitting && state.kind === 'open' ? { kind: 'submitting' } : state
      }
      error={error}
      onEnter={() => answer('accept')}
      footerClassName="justify-between"
      actions={
        <>
          <RequestAction disabled={inactive} onPress={() => answer('cancel')}>
            Dismiss
          </RequestAction>
          <View className="flex-row gap-1">
            <RequestAction
              disabled={inactive}
              onPress={() => answer('decline')}
            >
              Decline
            </RequestAction>
            <RequestAction
              primary
              disabled={inactive || !isValid}
              onPress={() => answer('accept')}
            >
              {submitting || isSubmitting ? 'Sending…' : 'Submit'}
            </RequestAction>
          </View>
        </>
      }
    >
      <View pointerEvents={inactive ? 'none' : 'auto'}>
        <View className="gap-1 px-4 pt-4 pb-1">
          {source && (
            <View className="flex-row items-center gap-1.5">
              <Icon name="plug" size="sm" className="text-muted-foreground" />
              <Text role="secondary">{source} asks</Text>
            </View>
          )}
          <Text role={'heading'}>{request.message}</Text>
        </View>
        <View className="gap-4 px-4 pt-3 pb-1">
          {schema.fields.map(({ name, key, property, required }) => (
            <form.Field key={key} name={key}>
              {(field) => (
                <ElicitationField
                  name={name}
                  property={property}
                  required={required}
                  value={field.state.value}
                  error={field.state.meta.errors[0]}
                  showError={
                    field.state.meta.isTouched ||
                    initialValues[name] !== undefined ||
                    property.default !== undefined
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  inactive={inactive}
                />
              )}
            </form.Field>
          ))}
        </View>
      </View>
      {!alreadyAnswered && invalid.length > 0 && (
        <View role="alert" className="flex-row items-center gap-1.5 px-4 pt-3">
          <Icon name="error" size="sm" className="shrink-0 text-destructive" />
          <Text role="secondary" className="min-w-0 flex-1 text-destructive">
            Fix{' '}
            {invalid
              .map(({ name, property }) => property.title ?? name)
              .join(', ')}{' '}
            to submit
          </Text>
        </View>
      )}
    </RequestCard>
  );
}
