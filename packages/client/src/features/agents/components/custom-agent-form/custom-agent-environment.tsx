import type { EnvironmentVariable } from '@repo/contracts';
import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import {
  errorMessage,
  type FieldErrors,
} from '#primitives/fields/field-errors';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { VariableRow } from '../custom-agent-launch';
import { sectionFooter } from '../form-field';
import { keyedRows } from '../keyed-rows';
import { AddEntryRow, type FormPartProps } from './custom-agent-form-sections';
import { type Editing, newVariable } from './variable-sheet';

type SectionProps = FormPartProps & { onEdit: (editing: Editing) => void };

type Environment = { env: EnvironmentVariable[]; errors: FieldErrors };

type ValuesProps = SectionProps & Environment;

const environmentHint =
  'Stored on the Server in plain text. Not for API keys or other secrets; sign in through the Agent instead.';

export function useEnvironment(form: FormPartProps['form']): Environment {
  const env = useStore(form.store, (state) => state.values.env);

  const errors = useStore(
    form.store,
    (state) => state.fieldMeta.env?.errors ?? noErrors,
  );

  return { env, errors };
}

const noErrors: FieldErrors = [];

const environmentFooter = ({
  errors,
}: ValuesProps): ReturnType<typeof sectionFooter> =>
  sectionFooter(errorMessage(errors), environmentHint);

/*
 * One row per variable; each opens its editor, and the last row adds one. A list error replaces the hint.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
export function environmentSection(props: ValuesProps): React.JSX.Element {
  return (
    <GroupedListSection
      title="Environment variables"
      {...environmentFooter(props)}
    >
      {variableRows(props)}
      {addVariableRow(props)}
    </GroupedListSection>
  );
}

function addVariableRow(props: ValuesProps): React.JSX.Element {
  return (
    <AddEntryRow
      label="Add environment variable"
      disabled={props.disabled}
      onPress={() => props.onEdit(newVariable)}
    />
  );
}

function variableRows(props: ValuesProps): React.JSX.Element[] {
  return keyedRows(props.env).map(({ key, index, value }) => (
    <VariableRow
      key={key}
      variable={value}
      disabled={props.disabled}
      onPress={() => props.onEdit({ index, variable: value })}
    />
  ));
}
