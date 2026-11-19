import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import {
  DialogCancel,
  DialogFooter,
} from '@repo/kit/primitives/overlays/dialog';
import type { ReactElement } from 'react';
import { canSaveDraft, type CustomVoiceDraft } from './custom-voice-draft';
import type { FormProps } from './custom-voice-props';

type FooterProps = FormProps & { draft: CustomVoiceDraft };

// A failed save or delete says why above the actions, as an alert.
const failure = (error?: string): ReactElement | null =>
  error ? (
    <Text accessibilityRole="alert" role="secondary" tone="danger">
      {error}
    </Text>
  ) : null;

// The failure, then Delete when editing, Preview, Cancel and Save.
export const FormFooter = (props: FooterProps): ReactElement => (
  <>
    {failure(props.error)}
    <DialogFooter>
      <DeleteButton {...props} />
      <ReadyButtons {...props} />
    </DialogFooter>
  </>
);

// Hearing and saving need a name and a description.
function ReadyButtons(props: FooterProps): ReactElement {
  const disabled = !canSaveDraft(props.draft);

  return (
    <>
      <PreviewButton {...props} disabled={disabled} />
      <DialogCancel label="Cancel" />
      <SaveButton {...props} disabled={disabled} />
    </>
  );
}

const PreviewButton = (
  props: FooterProps & { disabled: boolean },
): ReactElement => (
  <Button
    variant="secondary"
    icon="play"
    label="Preview"
    disabled={props.disabled}
    onPress={() => props.onPreview(props.draft)}
  />
);

const SaveButton = (
  props: FooterProps & { disabled: boolean },
): ReactElement => (
  <Button
    label="Save"
    disabled={props.disabled}
    onPress={() => props.onSave(props.draft)}
  />
);

function DeleteButton(props: FooterProps): ReactElement | null {
  const { voice } = props.editor;

  return voice ? (
    <Button
      variant="danger"
      label="Delete"
      onPress={() => props.onDelete(voice.id)}
    />
  ) : null;
}
