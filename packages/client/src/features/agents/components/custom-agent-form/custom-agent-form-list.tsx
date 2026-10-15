import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';
import type { Editing as ArgumentEditing } from './argument-sheet';
import { argumentsSection, useArguments } from './custom-agent-arguments';
import { environmentSection, useEnvironment } from './custom-agent-environment';
import { type ActionProps, formActions } from './custom-agent-form-actions';
import { programSection, useProgramError } from './custom-agent-form-sections';
import type { Editing as VariableEditing } from './variable-sheet';

type FormValues = {
  error: string | undefined;
  args: string[];
  environment: ReturnType<typeof useEnvironment>;
  wide: boolean;
};

export type SectionsProps = ActionProps & {
  // Sections the page shows above the form in the same group, such as the Agent's Status.
  leading?: React.ReactNode;
  // The check's failure, set between the sections and the actions.
  failure: React.ReactNode;
  onArgument: (editing: ArgumentEditing | null) => void;
  onVariable: (editing: VariableEditing | null) => void;
};

type ListProps = SectionsProps & { values: FormValues };

/*
 * GroupedList takes its sections as direct children, so each one is called rather than rendered,
 * with the form's values read here.
 */
export function FormSections(props: SectionsProps): React.JSX.Element {
  const values = useFormValues(props.form);

  return (
    <GroupedList>
      {props.leading}
      {entrySections({ ...props, values })}
      {props.failure}
      {formActions({ ...props, wide: values.wide })}
    </GroupedList>
  );
}

function useFormValues(form: CustomAgentFormApi): FormValues {
  return {
    error: useProgramError(form),
    args: useArguments(form),
    environment: useEnvironment(form),
    wide: useWide(),
  };
}

// The program, its arguments and its variables; FieldGroup reads through the fragment.
function entrySections(props: ListProps): React.JSX.Element {
  const part = { form: props.form, disabled: props.disabled };
  const { error, args, environment } = props.values;

  return (
    <>
      {programSection({ ...part, error })}
      {argumentsSection({ ...part, args, onEdit: props.onArgument })}
      {environmentSection({
        ...part,
        ...environment,
        onEdit: props.onVariable,
      })}
    </>
  );
}
