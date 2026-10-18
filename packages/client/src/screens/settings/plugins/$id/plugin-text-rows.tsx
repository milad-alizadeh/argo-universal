import type * as React from 'react';
import { useState } from 'react';
import { TextInput } from '#primitives/inputs/text-input';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';

type TextRowProps = {
  label: string;
  hint?: string;
  value: string;
  onSave: (value: string) => void;
};

// Saves when the field loses focus, and only a changed value: a quick Server write, so no spinner.
export function TextRow({
  value,
  onSave,
  ...row
}: TextRowProps): React.JSX.Element {
  return <TextInput variant="row" {...row} {...useTextDraft(value, onSave)} />;
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

// A secret never comes back from the Server: the field starts empty, says whether one is saved, and a typed value replaces it.
export function SecretRow(props: SecretRowProps): React.JSX.Element {
  const { set, onSave, ...row } = props;

  return (
    <>
      <TextInput
        variant="row"
        secure
        {...row}
        placeholder={set ? 'Saved in the Keychain' : 'Not set'}
        {...useSecretDraft(onSave)}
      />
      {set ? <ClearSecretRow {...props} /> : null}
    </>
  );
}

// An empty secret clears it from the Keychain.
function ClearSecretRow({ label, onSave }: SecretRowProps): React.JSX.Element {
  return (
    <GroupedListItem
      label={`Clear ${label}`}
      tone="danger"
      disclosure={false}
      onPress={() => onSave('')}
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
