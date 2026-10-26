import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useCentresOverlays } from '@repo/kit/primitives/overlays/centred-overlay';
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import { type ReactElement, useRef, useState } from 'react';
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
  const openings = useOpenings(props.open);

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <RenameForm key={openings} {...props} />
    </Dialog>
  );
}

// Each opening is a new form, so it starts from the Session's title, not from what an earlier opening left in the field.
function useOpenings(open: boolean): number {
  const [openings, setOpenings] = useState({ open, count: 0 });

  if (open !== openings.open)
    setOpenings({ open, count: openings.count + (open ? 1 : 0) });

  return openings.count;
}

const heading = (
  <DialogHeader>
    <DialogTitle>{copy.title}</DialogTitle>
    <DialogDescription>{copy.description}</DialogDescription>
  </DialogHeader>
);

/*
 * The dialog's own children, not a component of theirs: on a phone it reads the heading, the section and the actions
 * by element type, scrolls the section in a FieldGroup under the heading and pins the failure and the actions below.
 */
function RenameForm(props: RenameSessionDialogProps): ReactElement {
  const draft = useDraft(props.title);
  const save = (): void => saveDraft(draft.latest.current, props);
  const narrow = !useCentresOverlays();

  return (
    <DialogContent accessibilityLabel={copy.title} size="sm">
      {heading}
      {titleSection(props, draft, save)}
      {failure(props.error)}
      {actions(narrow, save)}
    </DialogContent>
  );
}

const titleSection = (
  props: RenameSessionDialogProps,
  draft: Draft,
  save: () => void,
): ReactElement => (
  <FieldGroup.Section>
    {titleRow({
      value: draft.text,
      onChangeText: draft.change,
      onSubmit: save,
      invalid: props.error !== undefined,
    })}
  </FieldGroup.Section>
);

// A failed rename says why under the field, as an alert.
const failure = (error?: string): ReactElement | null =>
  error ? (
    <Text accessibilityRole="alert" role="secondary" tone="danger">
      {error}
    </Text>
  ) : null;

// A centred dialog lines Cancel and Save up; a sheet stacks them, Save filling the width.
const actions = (narrow: boolean, save: () => void): ReactElement => (
  <DialogFooter>
    <DialogCancel label={copy.cancel} />
    <Button fullWidth={narrow} label={copy.save} onPress={save} />
  </DialogFooter>
);

type Draft = {
  text: string;
  latest: { current: string };
  change: (text: string) => void;
};

/*
 * Android commits the text and submits in one tick, before the state re-renders, so a save reads `latest`, which
 * a change sets at once.
 */
function useDraft(title: string): Draft {
  const [text, setText] = useState(title);
  const latest = useRef(title);

  const change = (next: string): void => {
    latest.current = next;
    setText(next);
  };

  return { text, latest, change };
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
