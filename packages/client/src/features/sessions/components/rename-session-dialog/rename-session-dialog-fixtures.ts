import type { RenameSessionDialogProps } from './rename-session-dialog';

// A story supplies Save and Cancel; a fixture is the title the field opens with, and why the last save failed.
type RenameSessionDialogFixture = Omit<
  RenameSessionDialogProps,
  'onRename' | 'onClose'
>;

export const editingTitle = {
  title: 'Build the Session layout',
  open: true,
} satisfies RenameSessionDialogFixture;

export const renameFailed = {
  ...editingTitle,
  error: 'Couldn’t rename the Session. Try again.',
} satisfies RenameSessionDialogFixture;
