import type * as React from 'react';
import { Alert, type AlertAction } from '#primitives/overlays/alert';

export interface ArchiveSessionAlertProps {
  open: boolean;
  // Archive: the caller archives the Session and the row leaves the list.
  onArchive: () => void;
  // Cancel, or the system closing the alert: the Session stays.
  onClose: () => void;
}

export const archiveSessionCopy = {
  title: 'Archive Session?',
  message:
    'Its worktree and any uncommitted files are removed. The branch is kept.',
  archive: 'Archive',
  cancel: 'Cancel',
};

// iOS and Android ask before every archive with the system alert; desktop and the web archive at once and offer Undo instead.
export function ArchiveSessionAlert(
  props: ArchiveSessionAlertProps,
): React.JSX.Element {
  return (
    <Alert
      open={props.open}
      onOpenChange={(open) => !open && props.onClose()}
      title={archiveSessionCopy.title}
      message={archiveSessionCopy.message}
      actions={archiveActions(props.onArchive)}
    />
  );
}

const archiveActions = (onArchive: () => void): AlertAction[] => [
  { label: archiveSessionCopy.cancel, cancel: true },
  { label: archiveSessionCopy.archive, tone: 'danger', onPress: onArchive },
];
