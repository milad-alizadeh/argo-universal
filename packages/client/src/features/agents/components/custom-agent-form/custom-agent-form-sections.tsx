import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { Platform } from 'react-native';
import {
  type FieldErrors,
  errorMessage,
} from '#primitives/fields/field-errors';
import { TextInput } from '#primitives/inputs/text-input';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';
import { sectionFooter, touchedInput } from '../form-field';

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

export function useProgramError(form: CustomAgentFormApi): string | undefined {
  return useStore(form.store, ({ fieldMeta }) =>
    errorMessage([
      ...touchedErrors(fieldMeta.name),
      ...touchedErrors(fieldMeta.executable),
    ]),
  );
}

/*
 * The name and the program; the footer gives the program's hint until a field has an error. Android's field says each under itself, so its section has no footer.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
const programFooter = (
  error: string | undefined,
): ReturnType<typeof sectionFooter> =>
  Platform.OS === 'android' ? {} : sectionFooter(error, executableHint);

export function programSection(
  props: FormPartProps & { error: string | undefined },
): React.JSX.Element {
  return (
    <GroupedListSection title="Program" {...programFooter(props.error)}>
      <NameField {...props} />
      <ExecutableField {...props} />
    </GroupedListSection>
  );
}

function NameField({ form, disabled }: FormPartProps): React.JSX.Element {
  return (
    <form.Field name="name">
      {(field) => (
        <TextInput
          variant="row"
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
        <TextInput
          variant="row"
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
  label: string;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return <GroupedListItem icon="add" tone="accent" {...props} />;
}
