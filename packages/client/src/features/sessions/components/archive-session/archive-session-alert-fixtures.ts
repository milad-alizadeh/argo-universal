import type { ArchiveSessionAlertProps } from './archive-session-alert';

// A story supplies Archive and Cancel; a fixture is whether the alert is up.
type ArchiveSessionAlertFixture = Omit<
  ArchiveSessionAlertProps,
  'onArchive' | 'onClose'
>;

export const archiveConfirm = {
  open: true,
} satisfies ArchiveSessionAlertFixture;
