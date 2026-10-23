import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useInCentredOverlay } from '@repo/kit/primitives/overlays/centred-overlay';
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
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
  placeholder: 'Session title',
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
      <RenameField
        invalid={props.error !== undefined}
        {...{ value: draft, onChangeText: setDraft, onSubmit: save }}
      />
      <RenameError error={props.error} />
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

type RenameFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  invalid: boolean;
};

/*
 * A FieldGroup fills its page and insets its section card: the box is the height of a section of one row, and the
 * inset is pulled back so the card lines up with the heading and the buttons.
 */
const sectionBox = 'h-20 -mx-4 -mb-3';

function RenameField(props: RenameFieldProps): ReactElement {
  return (
    <View className={sectionBox}>
      <FieldGroup>
        <FieldGroup.Section>{titleRow(props)}</FieldGroup.Section>
      </FieldGroup>
    </View>
  );
}

const titleRow = (props: RenameFieldProps): ReactElement => (
  <FieldGroup.TextField
    title={copy.field}
    hideTitle
    placeholder={copy.placeholder}
    value={props.value}
    error={props.invalid ? '' : undefined}
    /* oxlint-disable-next-line jsx-a11y/no-autofocus -- the dialog exists to rename; the title opens focused and selected, so typing replaces it. */
    autoFocus
    selectTextOnFocus
    onChangeText={props.onChangeText}
    onSubmit={props.onSubmit}
  />
);

function RenameError({ error }: { error?: string }): ReactElement | null {
  if (!error) return null;

  return (
    <Text accessibilityRole="alert" role="secondary" tone="danger">
      {error}
    </Text>
  );
}

function RenameHeading(): ReactElement {
  return (
    <View className="gap-2">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogDescription>{copy.description}</DialogDescription>
    </View>
  );
}

// A centred dialog lines Cancel and Save up; a sheet stacks them, Save filling the width.
function RenameActions(props: { onSave: () => void }): ReactElement {
  const centred = useInCentredOverlay();

  return (
    <DialogFooter>
      <DialogCancel label={copy.cancel} />
      <Button fullWidth={!centred} label={copy.save} onPress={props.onSave} />
    </DialogFooter>
  );
}
