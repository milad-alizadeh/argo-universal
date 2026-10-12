import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { FieldInput } from '#primitives/field-input';
import { FieldSection } from '#primitives/field-section';
import { ListItem } from '#primitives/list-item';
import {
  type FieldErrors,
  errorMessage,
} from '../../../lib/generic/primitives/field-errors';
import type { CustomAgentFormApi } from '../hooks/use-custom-agent-form';
import { sectionFooter, touchedInput } from './form-field';

export type FormPartProps = { form: CustomAgentFormApi; disabled: boolean };
type FieldMeta = { isTouched: boolean; errors: FieldErrors } | undefined;
const executableHint = "An absolute path, or a command on the Server's PATH.";
const executableInput = {
  mono: true,
  label: 'Executable',
  placeholder: '/usr/local/bin/example-agent',
  hint: executableHint,
};

// Errors show once the person has changed the field.
const touchedErrors = (meta: FieldMeta): FieldErrors =>
  meta?.isTouched ? meta.errors : [];

function useProgramError(form: CustomAgentFormApi): string | undefined {
  return useStore(form.store, ({ fieldMeta }) =>
    errorMessage([
      ...touchedErrors(fieldMeta.name),
      ...touchedErrors(fieldMeta.executable),
    ]),
  );
}

// The name and the program; the footer gives the program's hint until a field has an error. Android puts each under its field.
export function ProgramSection(props: FormPartProps): React.JSX.Element {
  return (
    <FieldSection
      textFields
      title="Program"
      {...sectionFooter(useProgramError(props.form), executableHint)}
    >
      <NameField {...props} />
      <ExecutableField {...props} />
    </FieldSection>
  );
}

function NameField({ form, disabled }: FormPartProps): React.JSX.Element {
  return (
    <form.Field name="name">
      {(field) => (
        <FieldInput
          label="Name"
          placeholder="Example Agent"
          {...touchedInput(field)}
          disabled={disabled}
        />
      )}
    </form.Field>
  );
}

function ExecutableField({ form, disabled }: FormPartProps): React.JSX.Element {
  return (
    <form.Field name="executable">
      {(field) => (
        <FieldInput
          {...executableInput}
          {...touchedInput(field)}
          disabled={disabled}
        />
      )}
    </form.Field>
  );
}

// The last row of a list section, which adds an entry in its editor.
export function AddEntryRow(props: {
  title: string;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return <ListItem icon="add" tone="accent" {...props} />;
}
