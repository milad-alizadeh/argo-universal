import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { useState } from 'react';

type TextRowProps = {
  label: string;
  value: string;
  onSave: (value: string) => void;
};

// Saves when the field loses focus, and only a changed value: a quick Server write, so no spinner.
export function TextRow({
  label,
  value,
  onSave,
}: TextRowProps): React.JSX.Element {
  return (
    <FieldGroup.TextField title={label} {...useTextDraft(value, onSave)} />
  );
}

type Draft = {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};

function useTextDraft(value: string, onSave: (value: string) => void): Draft {
  const [draft, setDraft] = useState(value);

  const onBlur = (): void => {
    if (draft !== value) onSave(draft);
  };

  return { value: draft, onChangeText: setDraft, onBlur };
}

type SecretRowProps = Omit<TextRowProps, 'value'> & { set: boolean };

/*
 * A secret never comes back from the Server: the field starts empty, says whether one is saved, and a typed value
 * replaces it. Its rows sit straight in the section, so a saved one adds Clear as a row of its own.
 */
export const secretRows = (props: SecretRowProps): React.JSX.Element => (
  <>
    <SecretRow {...props} />
    {props.set ? (
      <Button
        label={`Clear ${props.label}`}
        variant="text"
        onPress={() => props.onSave('')}
      />
    ) : null}
  </>
);

function SecretRow({ label, set, onSave }: SecretRowProps): React.JSX.Element {
  return (
    <FieldGroup.SecretField
      title={label}
      placeholder={set ? 'Saved in the Keychain' : 'Not set'}
      {...useSecretDraft(onSave)}
    />
  );
}

// A typed secret is sent once and cleared; an untouched field sends nothing.
function useSecretDraft(onSave: (value: string) => void): Draft {
  const [draft, setDraft] = useState('');

  const onBlur = (): void => {
    if (draft === '') return;

    onSave(draft);
    setDraft('');
  };

  return { value: draft, onChangeText: setDraft, onBlur };
}
