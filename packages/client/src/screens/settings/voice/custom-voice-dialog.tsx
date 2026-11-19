import type { VoiceOption } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { FieldLabelScope } from '@repo/kit/primitives/fields/field-row';
import { Dialog, DialogForm } from '@repo/kit/primitives/overlays/dialog';
import { useState, type ReactElement } from 'react';
import { draftOf, type CustomVoiceDraft } from './custom-voice-draft';
import { FormFooter } from './custom-voice-footer';
import type {
  CustomVoiceDialogProps,
  CustomVoiceEditor,
  FormProps,
} from './custom-voice-props';

const keyOf = (editor: CustomVoiceEditor): string => editor.voice?.id ?? 'new';

// Each opening is a form of its own, on the voice it edits.
const formOf = (props: CustomVoiceDialogProps): ReactElement | null =>
  props.editor ? (
    <CustomVoiceForm
      key={keyOf(props.editor)}
      {...props}
      editor={props.editor}
    />
  ) : null;

/*
 * Adding or editing a custom voice (Paper "3 · Form", option A): a Dialog on a wide window and a Sheet on a phone, with
 * its name, the built-in voice it speaks with and how it speaks. It can be heard before it is saved.
 */
export function CustomVoiceDialog(props: CustomVoiceDialogProps): ReactElement {
  return (
    <Dialog
      open={props.editor !== undefined}
      onOpenChange={(open) => !open && props.onClose()}
    >
      {formOf(props)}
    </Dialog>
  );
}

type Draft = {
  draft: CustomVoiceDraft;
  change: (part: Partial<CustomVoiceDraft>) => void;
};

function useDraft(props: FormProps): Draft {
  const first = props.voices[0]?.id ?? '';
  const [draft, setDraft] = useState(draftOf(props.editor.voice, first));

  return {
    draft,
    change: (part) => setDraft((held) => ({ ...held, ...part })),
  };
}

function CustomVoiceForm(props: FormProps): ReactElement {
  const held = useDraft(props);

  return (
    <DialogForm
      title={props.editor.voice ? 'Edit custom voice' : 'New custom voice'}
      size="md"
      footer={<FormFooter {...props} draft={held.draft} />}
    >
      {voiceSection(props, held)}
      {descriptionSection(props, held)}
      {deleteSection(props)}
    </DialogForm>
  );
}

const nameRow = ({ draft, change }: Draft): ReactElement => (
  <FieldGroup.TextField
    title="Name"
    placeholder="Narrator"
    value={draft.label}
    onChangeText={(label) => change({ label })}
  />
);

const voiceOptions = (
  voices: VoiceOption[],
): React.ComponentProps<typeof FieldGroup.Picker>['options'] =>
  voices.map(({ id, label }) => ({ value: id, label }));

// GPT-Live cannot make a voice from words, so the description is told to the built-in voice it speaks with.
const speechFooter = (provider: string): string =>
  `${provider} has fixed voices; this description is told to the voice you pick.`;

const baseVoiceRow = (
  props: FormProps,
  { draft, change }: Draft,
): ReactElement => (
  <FieldGroup.Picker
    title="Speaks with"
    presentation="menu"
    value={draft.baseVoice}
    options={voiceOptions(props.voices)}
    onValueChange={(baseVoice) => change({ baseVoice })}
  />
);

// Called, not rendered, as a FieldGroup reads its rows off the elements it is given.
const voiceSection = (props: FormProps, held: Draft): ReactElement => (
  <FieldGroup.Section key="voice">
    {nameRow(held)}
    {baseVoiceRow(props, held)}
  </FieldGroup.Section>
);

const descriptionRow = ({ draft, change }: Draft): ReactElement => (
  <FieldGroup.TextField
    title="How it speaks"
    placeholder="A calm documentary narrator, unhurried and warm."
    multiline
    value={draft.description}
    onChangeText={(description) => change({ description })}
  />
);

// Its title sits above the field on a wide window, as the board draws it.
const descriptionSection = (props: FormProps, held: Draft): ReactElement => (
  <FieldGroup.Section
    key="description"
    footer={speechFooter(props.providerLabel)}
  >
    <FieldLabelScope>{descriptionRow(held)}</FieldLabelScope>
  </FieldGroup.Section>
);

// Only a saved voice can be deleted: a row of its own, under the description.
function deleteSection(props: FormProps): ReactElement | null {
  const { voice } = props.editor;

  return voice ? (
    <FieldGroup.Section key="delete">
      <FieldGroup.Link
        title="Delete custom voice"
        action
        destructive
        onPress={() => props.onDelete(voice.id)}
      />
    </FieldGroup.Section>
  ) : null;
}
