import { Alert, type AlertAction } from '@repo/kit/primitives/overlays/alert';
import type * as React from 'react';

export interface ArchiveSessionAlertProps {
  open: boolean;
  // The Project keeps the worktree on archive, so nothing on disk goes.
  keepsWorktree?: boolean;
  losesWork?: boolean;
  // Archive: the caller archives the Session and the row leaves the list.
  onArchive: () => void;
  // Cancel, or the system closing the alert: the Session stays.
  onClose: () => void;
}

export const archiveSessionCopy = {
  title: 'Archive Session?',
  message:
    'Argo removes the Checkout if it can do so safely. The branch is kept.',
  messageKeepsWorktree: 'Its Checkout and branch are kept.',
  messageLosesWork:
    'Removing the Checkout will discard uncommitted files or commits that no branch or tag preserves.',
  archive: 'Archive',
  cancel: 'Cancel',
};

// iOS and Android ask before every archive. Desktop and web ask before removing work.
export function ArchiveSessionAlert(
  props: ArchiveSessionAlertProps,
): React.JSX.Element {
  return (
    <Alert
      open={props.open}
      onOpenChange={(open) => !open && props.onClose()}
      title={archiveSessionCopy.title}
      message={alertMessage(props)}
      actions={archiveActions(props.onArchive)}
    />
  );
}

function alertMessage({
  keepsWorktree,
  losesWork,
}: ArchiveSessionAlertProps): string {
  if (losesWork) return archiveSessionCopy.messageLosesWork;

  return keepsWorktree
    ? archiveSessionCopy.messageKeepsWorktree
    : archiveSessionCopy.message;
}

const archiveActions = (onArchive: () => void): AlertAction[] => [
  { label: archiveSessionCopy.cancel, role: 'cancel' },
  { label: archiveSessionCopy.archive, tone: 'danger', onPress: onArchive },
];
