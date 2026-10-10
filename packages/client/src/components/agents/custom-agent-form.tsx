import type { CustomAgentDefinition } from '@repo/contracts';
import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Icon } from '../../lib/icon';
import { FormActions } from './custom-agent-form-actions';
import {
  EnvironmentSection,
  ProgramSection,
} from './custom-agent-form-sections';
import {
  type SubmitCustomAgent,
  useCustomAgentForm,
} from './use-custom-agent-form';

export type CustomAgentFormProps = {
  initial?: CustomAgentDefinition;
  submitLabel: string;
  onSubmit: SubmitCustomAgent;
  onCancel: () => void;
};
const formDescription =
  'Any program on the Server that speaks ACP over stdio. Argo runs it with exactly these arguments, without a shell.';

export function CustomAgentForm(
  props: CustomAgentFormProps,
): React.JSX.Element {
  const { form, failure } = useCustomAgentForm(props);
  const checking = useStore(form.store, (state) => state.isSubmitting);
  return (
    <View className="gap-8">
      <Text className="type-secondary">{formDescription}</Text>
      <ProgramSection form={form} disabled={checking} />
      <EnvironmentSection form={form} disabled={checking} />
      <CheckFailure failure={checking ? null : failure} />
      <FormActions {...props} form={form} disabled={checking} />
    </View>
  );
}

function CheckFailure({
  failure,
}: {
  failure: string | null;
}): React.JSX.Element | null {
  if (!failure) return null;
  return <FailureBox failure={failure} />;
}

function FailureBox({ failure }: { failure: string }): React.JSX.Element {
  return (
    <View
      role="alert"
      className="flex-row gap-2 rounded-md bg-destructive/8 p-3"
    >
      <Icon name="warning" className="text-destructive" />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="type-heading text-destructive">Check failed</Text>
        <Text className="type-code">{failure}</Text>
      </View>
    </View>
  );
}
