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

export function OrderControls(row: Row): ReactElement {
  return (
    <>
      <QueueIcon {...moveUpProps(row)} />
      <QueueIcon {...moveDownProps(row)} />
    </>
  );
}

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

function moveUpProps(row: Row): QueueIconProps {
  return {
    label: 'Move Prompt up',
    icon: 'arrow-up',
    disabled: controlsDisabled(row) || row.index === 0,
    onPress: () => move(row, row.index - 1),
  };
}

function moveDownProps(row: Row): QueueIconProps {
  return {
    label: 'Move Prompt down',
    icon: 'arrow-down',
    disabled: controlsDisabled(row) || row.index === row.queue.items.length - 1,
    onPress: () => move(row, row.index + 2),
  };
}

function move(row: Row, before: number): void {
  const beforeId = row.queue.items[before]?.id ?? null;
  row.run({
    action: 'move',
    id: row.row.id,
    revision: row.row.revision,
    beforeId,
  });
}

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
      <IconButton {...props} accessibilityLabel={label} size="sm" />
    </Tooltip>
  );
}
