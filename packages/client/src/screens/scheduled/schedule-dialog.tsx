import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { ReactElement } from 'react';
import { ScheduleDeleteView } from './schedule-delete-view';
import {
  ScheduleFormScreen,
  type ScheduleContext,
} from './schedule-form-screen';
import type { useScheduleManagement } from './scheduled-management';

type ScheduleDialogProps = {
  context?: ScheduleContext;
  management: ReturnType<typeof useScheduleManagement>;
};

export function ScheduleDialog(props: ScheduleDialogProps): ReactElement {
  const { overlay, onClose, saving } = props.management;

  return (
    <Dialog
      open={overlay !== undefined}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <ScheduleDialogContent {...props} />
    </Dialog>
  );
}

function ScheduleDialogContent({
  context,
  management,
}: ScheduleDialogProps): ReactElement | null {
  const { overlay, onClose, saving, onDelete } = management;

  if (!overlay) return null;

  switch (overlay.type) {
    case 'create':
      return <ScheduleFormScreen context={context} onClose={onClose} />;
    case 'edit':
      return (
        <ScheduleFormScreen
          context={overlay.schedule}
          editing={overlay.schedule}
          onClose={onClose}
        />
      );
    case 'delete':
      return (
        <ScheduleDeleteView
          schedule={overlay.schedule}
          saving={saving}
          onDelete={() => onDelete(overlay.schedule)}
        />
      );
  }
}
