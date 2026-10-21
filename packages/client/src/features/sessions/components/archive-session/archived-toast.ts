import type { Toast } from '@repo/kit/primitives/overlays/toast';

const archivedToastCopy = { title: 'Session archived', undo: 'Undo' };

// Desktop and the web: the row has already left the list; Undo puts it back while the toast shows.
export const archivedToast = (onUndo: () => void): Toast => ({
  tone: 'success',
  title: archivedToastCopy.title,
  action: { label: archivedToastCopy.undo, onPress: onUndo },
});
