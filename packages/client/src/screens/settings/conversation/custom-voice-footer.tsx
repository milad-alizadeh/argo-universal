import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { DialogFooter } from '@repo/kit/primitives/overlays/dialog';
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

// The failure, then Save, the form's one action: the header's X closes the form, and Preview plays from the voice row.
export const FormFooter = (props: FooterProps): ReactElement => (
  <>
    {failure(props.error)}
    <DialogFooter>
      <Button
        label="Save"
        disabled={!canSaveDraft(props.draft)}
        onPress={() => props.onSave(props.draft)}
      />
    </DialogFooter>
  </>
);
