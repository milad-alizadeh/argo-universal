import type { CustomAgentDefinition } from '@repo/contracts';
import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import {
  type CustomAgentFormApi,
  type SubmitCustomAgent,
  useCustomAgentForm,
} from '../../hooks/use-custom-agent-form';
import {
  ArgumentSheet,
  type Editing as ArgumentEditing,
} from './argument-sheet';
import { FormSections } from './custom-agent-form-list';
import { DiscardGuard } from './discard-guard';
import {
  type Editing as VariableEditing,
  VariableSheet,
} from './variable-sheet';

export type CustomAgentFormProps = {
  initial?: CustomAgentDefinition;
  submitLabel: string;
  onSubmit: SubmitCustomAgent;
  onCancel: () => void;
  // Sections the page shows above the form in the same group, such as the Agent's Status.
  leading?: React.ReactNode;
};

export const customAgentFormDescription =
  'Any program on the Server that speaks ACP over stdio. Argo runs it with exactly these arguments, without a shell.';

type Sheets = {
  argument: ArgumentEditing | null;
  onArgument: (editing: ArgumentEditing | null) => void;
  variable: VariableEditing | null;
  onVariable: (editing: VariableEditing | null) => void;
};

function useEntrySheets(): Sheets {
  const [argument, onArgument] = useState<ArgumentEditing | null>(null);
  const [variable, onVariable] = useState<VariableEditing | null>(null);

  return { argument, onArgument, variable, onVariable };
}

/*
 * The launch form as Settings sections: the program, its arguments and its variables,
 * each entry a row that opens its editor, then the check's failure and the actions.
 */
export function CustomAgentForm(
  props: CustomAgentFormProps,
): React.JSX.Element {
  const state = useFormState(props);
  const sheets = useEntrySheets();
  const failure = checkFailure(state.failure);

  return (
    <>
      <FormSections {...props} {...sheets} {...state} failure={failure} />
      <DiscardGuard form={state.form} />
      <EntryEditors form={state.form} {...sheets} />
    </>
  );
}

type FormState = {
  form: CustomAgentFormApi;
  disabled: boolean;
  failure: string | null;
};

// While the Server checks the program, the form is disabled and the last failure is hidden.
function useFormState(props: CustomAgentFormProps): FormState {
  const { form, failure } = useCustomAgentForm(props);
  const checking = useStore(form.store, (state) => state.isSubmitting);

  return { form, disabled: checking, failure: checking ? null : failure };
}

type EditorProps = Sheets & { form: CustomAgentFormApi };

// The editors open over the group, outside its native form.
function EntryEditors(props: EditorProps): React.JSX.Element {
  return (
    <>
      <ArgumentEditor {...props} />
      <VariableEditor {...props} />
    </>
  );
}

function ArgumentEditor(props: EditorProps): React.JSX.Element | null {
  if (!props.argument) return null;

  return (
    <ArgumentSheet
      form={props.form}
      editing={props.argument}
      onEdit={props.onArgument}
    />
  );
}

function VariableEditor(props: EditorProps): React.JSX.Element | null {
  if (!props.variable) return null;

  return (
    <VariableSheet
      form={props.form}
      editing={props.variable}
      onEdit={props.onVariable}
    />
  );
}

function checkFailure(failure: string | null): React.JSX.Element | null {
  if (!failure) return null;

  return (
    <GroupedListContent key="failure">
      <FailureBox failure={failure} />
    </GroupedListContent>
  );
}

function FailureBox({ failure }: { failure: string }): React.JSX.Element {
  return (
    <View role="alert" className="flex-row gap-2 rounded-md bg-danger/8 p-3">
      <Icon role="control" name="warning" className="text-danger" />
      <FailureMessage failure={failure} />
    </View>
  );
}

function FailureMessage({ failure }: { failure: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text role={'heading'} className="text-danger">
        Check failed
      </Text>
      <Text role="code">{failure}</Text>
    </View>
  );
}
