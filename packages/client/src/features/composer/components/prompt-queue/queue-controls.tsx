import { Button } from '@repo/kit/primitives/actions/button';
import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import type { ReactElement } from 'react';
import type { QueueRow as Row } from './use-queue-row';

type QueueIconProps = Omit<IconButtonProps, 'accessibilityLabel'> & {
  label: string;
  tooltip: string;
};

export function EditControls(row: Row): ReactElement {
  return (
    <>
      <SteerControl {...row} />
      <QueueIcon {...editProps(row)} />
      <QueueIcon {...deleteProps(row)} />
    </>
  );
}

const controlsDisabled = (row: Row): boolean =>
  [row.pending, row.editing, row.holds.length > 0, row.editorBusy].some(
    Boolean,
  );

function editProps(row: Row): QueueIconProps {
  return {
    label: 'Edit Queued Prompt',
    tooltip: 'Edit',
    icon: 'edit',
    disabled: controlsDisabled(row),
    onPress: row.begin,
  };
}

function deleteProps(row: Row): QueueIconProps {
  return {
    label: 'Delete Queued Prompt',
    tooltip: 'Delete',
    icon: 'delete',
    disabled: controlsDisabled(row),
    onPress: () => remove(row),
  };
}

function remove(row: Row): void {
  row.run({ action: 'delete', id: row.row.id, revision: row.row.revision });
}

function QueueIcon({ label, tooltip, ...props }: QueueIconProps): ReactElement {
  return (
    <Tooltip label={tooltip}>
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

function SteerControl(row: Row): ReactElement | null {
  return row.canSteer ? (
    <Button
      label="Steer"
      icon="steer"
      variant="text"
      size="sm"
      control
      disabled={controlsDisabled(row)}
      onPress={() =>
        row.run({ action: 'steer', id: row.row.id, revision: row.row.revision })
      }
    />
  ) : null;
}
