import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import type { ReactElement } from 'react';
import type { QueueRow as Row } from './use-queue-row';

type QueueIconProps = Omit<IconButtonProps, 'accessibilityLabel'> & {
  label: string;
};

export function EditControls(row: Row): ReactElement {
  return (
    <>
      <QueueIcon {...editProps(row)} />
      <QueueIcon {...deleteProps(row)} />
    </>
  );
}

const controlsDisabled = (row: Row): boolean =>
  row.pending || row.holds.includes(row.row.id);

function editProps(row: Row): QueueIconProps {
  return {
    label: 'Edit Queued Prompt',
    icon: 'edit',
    disabled: controlsDisabled(row),
    onPress: row.begin,
  };
}

function deleteProps(row: Row): QueueIconProps {
  return {
    label: 'Delete Queued Prompt',
    icon: 'delete',
    disabled: controlsDisabled(row),
    onPress: () => remove(row),
  };
}

function remove(row: Row): void {
  row.run({ action: 'delete', id: row.row.id, revision: row.row.revision });
}

function QueueIcon({ label, ...props }: QueueIconProps): ReactElement {
  return (
    <Tooltip label={label}>
      <IconButton
        {...props}
        accessibilityLabel={label}
        size="sm"
        variant="ghost"
        muted
      />
    </Tooltip>
  );
}
