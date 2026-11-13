import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';

export interface SessionChangeAttachProps {
  /*
   * Attaches the PR a reference names: `owner/name#12`, its URL or, in the Project's own repository, its number.
   * Answers whether it was attached; a refusal is toasted by the App, and the field keeps what was typed.
   */
  onAttach: (reference: string) => Promise<boolean>;
}

interface Entry {
  reference: string;
  setReference: (reference: string) => void;
  attach: () => void;
}

function useEntry({ onAttach }: SessionChangeAttachProps): Entry {
  const [reference, setReference] = useState('');

  const attach = async (): Promise<void> => {
    if (reference.trim() && (await onAttach(reference.trim())))
      setReference('');
  };

  return { reference, setReference, attach: () => void attach() };
}

function Field({ entry }: { entry: Entry }): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.TextField
        title="Pull request"
        placeholder="owner/repo#123"
        value={entry.reference}
        onChangeText={entry.setReference}
      />
    </FieldGroup>
  );
}

function AttachButton({ entry }: { entry: Entry }): ReactElement {
  return (
    <Button
      size="sm"
      label="Attach"
      disabled={!entry.reference.trim()}
      onPress={entry.attach}
    />
  );
}

// Provisional (the owner reviews it in Storybook): a reference field and an Attach button, from existing primitives.
export function SessionChangeAttach(
  props: SessionChangeAttachProps,
): ReactElement {
  const entry = useEntry(props);

  return (
    <View className="gap-2 px-3 py-2">
      <Field entry={entry} />
      <AttachButton entry={entry} />
    </View>
  );
}
