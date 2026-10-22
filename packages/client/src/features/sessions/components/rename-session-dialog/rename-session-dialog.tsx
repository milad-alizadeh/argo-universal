import { Button } from '@repo/kit/primitives/actions/button';
import { TextInput } from '@repo/kit/primitives/inputs/text-input';
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { type ReactElement, useState } from 'react';
import { Platform, View } from 'react-native';
import { renamedTitle } from './renamed-title';

export type RenameSessionDialogProps = {
  // The Session's title now, which the field opens with, all of it selected.
  title: string;
  open: boolean;
  // Why the last rename failed; the dialog stays open and says so under the field.
  error?: string;
  // A new title to save; the caller closes the dialog once the Server has it.
  onRename: (title: string) => void;
  // Cancel, Escape, the backdrop or a swipe, or a save that leaves the title as it was.
  onClose: () => void;
};

const copy = {
  title: 'Rename Session',
  description: 'Keep it short and easy to find in the list.',
  field: 'Title',
  save: 'Save',
  cancel: 'Cancel',
};

export function RenameSessionDialog(
  props: RenameSessionDialogProps,
): ReactElement {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent accessibilityLabel={copy.title} size="sm">
        <RenameForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

// Mounted with the dialog's content, so each opening starts from the Session's title.
function RenameForm(props: RenameSessionDialogProps): ReactElement {
  const [draft, setDraft] = useState(props.title);
  const save = (): void => saveDraft(draft, props);

  return (
    <>
      <RenameHeading />
      <TextInput
        {...titleField}
        {...{ value: draft, onChangeText: setDraft, onSubmit: save }}
        errors={[props.error]}
      />
      <RenameActions onSave={save} />
    </>
  );
}

// A blank title, or the same one again, closes the dialog and keeps the old title.
function saveDraft(draft: string, props: RenameSessionDialogProps): void {
  const title = renamedTitle(draft, props.title);

  if (title === undefined) props.onClose();
  else props.onRename(title);
}

function RenameHeading(): ReactElement {
  return (
    <View className="gap-2">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogDescription>{copy.description}</DialogDescription>
    </View>
  );
}

function RenameActions(props: { onSave: () => void }): ReactElement {
  const wide = useWide();

  return (
    <DialogFooter>
      <DialogCancel label={copy.cancel} />
      <Button fullWidth={!wide} label={copy.save} onPress={props.onSave} />
    </DialogFooter>
  );
}

// The field opens focused with the whole title selected, so typing replaces it. Android's outlined field carries its label in its outline; elsewhere the dialog's title says what the field holds.
const titleField = {
  label: copy.field,
  labelHidden: Platform.OS !== 'android',
  focusOnOpen: true,
  selectOnFocus: true,
};
