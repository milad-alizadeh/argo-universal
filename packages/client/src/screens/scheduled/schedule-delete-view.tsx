import type { ProjectSchedule } from '@repo/contracts/operations';
import { Button } from '@repo/kit/primitives/actions/button';
import {
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import type { ReactElement } from 'react';

export function ScheduleDeleteView({
  schedule,
  saving,
  onDelete,
}: {
  schedule: ProjectSchedule;
  saving: boolean;
  onDelete: () => void;
}): ReactElement {
  return (
    <DialogForm
      title="Delete Schedule"
      description={`Delete “${schedule.name}”? Its Session stays available in Sessions.`}
      dismissible={!saving}
      showClose={!saving}
      footer={
        <DialogFooter>
          <DialogCancel label="Cancel" disabled={saving} />
          <Button
            label="Delete Schedule"
            variant="danger"
            loading={saving}
            onPress={onDelete}
          />
        </DialogFooter>
      }
    >
      {null}
    </DialogForm>
  );
}
