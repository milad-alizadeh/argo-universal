import { type AgentRegistration, CustomAgentDefinition } from '@repo/contracts';
import {
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type ReactFormExtendedApi,
  useForm,
} from '@tanstack/react-form';
import { useState } from 'react';

export type SubmitCustomAgent = (
  definition: CustomAgentDefinition,
) => Promise<AgentRegistration>;
type CustomAgentFormInput = {
  initial?: CustomAgentDefinition;
  onSubmit: SubmitCustomAgent;
};
type Schema = typeof CustomAgentDefinition;
type Sync = FormValidateOrFn<CustomAgentDefinition> | undefined;
type Async = FormAsyncValidateOrFn<CustomAgentDefinition> | undefined;
export type CustomAgentFormApi = ReactFormExtendedApi<
  CustomAgentDefinition,
  Schema,
  Schema,
  Async,
  Sync,
  Async,
  Sync,
  Async,
  Sync,
  Async,
  Async,
  unknown
>;

export const emptyCustomAgent: CustomAgentDefinition = {
  name: '',
  executable: '',
  args: [],
  env: [],
};
const validators = {
  onMount: CustomAgentDefinition,
  onChange: CustomAgentDefinition,
};

async function submitDefinition(
  value: CustomAgentDefinition,
  onSubmit: SubmitCustomAgent,
  setFailure: (failure: string | null) => void,
): Promise<void> {
  setFailure(null);
  const result = await onSubmit(CustomAgentDefinition.parse(value));
  if (result.status === 'failed') setFailure(result.failure);
}

// The contract schema validates the whole definition once; its issue paths mark each field.
export function useCustomAgentForm({
  initial,
  onSubmit,
}: CustomAgentFormInput): { form: CustomAgentFormApi; failure: string | null } {
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm({
    defaultValues: initial ?? emptyCustomAgent,
    validators,
    onSubmit: ({ value }) => submitDefinition(value, onSubmit, setFailure),
  });
  return { form, failure };
}
