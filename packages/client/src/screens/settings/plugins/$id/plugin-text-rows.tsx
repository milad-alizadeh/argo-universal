import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { useTextDraft, type Draft } from '#features/settings';

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
      placeholder={set ? "Saved in the Server's secret store" : 'Not set'}
      {...useSecretDraft(onSave)}
    />
  );
}

// A typed secret is sent once and cleared; an untouched field sends nothing.
function useSecretDraft(onSave: (value: string) => void): Draft {
  const [draft, setDraft] = useState('');
  // Android changes the text and blurs in one tick, before `draft` re-renders, so a save reads the ref.
  const latest = useRef('');

  const onChangeText = (text: string): void => {
    latest.current = text;
    setDraft(text);
  };

  const onBlur = (): void => {
    if (latest.current === '') return;

    onSave(latest.current);
    latest.current = '';
    setDraft('');
  };

  return { value: draft, onChangeText, onBlur };
}
