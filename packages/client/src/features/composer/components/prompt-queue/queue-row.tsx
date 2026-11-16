import { Icon } from '@repo/kit/primitives/content/icon';
import { ListDragHandle } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { attachmentSummary, promptText } from './queue-content';
import { EditControls } from './queue-controls';
import type { QueueRowProps } from './queue-types';
import { useQueueRow, type QueueRow as Row } from './use-queue-row';

export function QueueRow(props: QueueRowProps & { id: string }): ReactElement {
  const row = useQueueRow(props);

  return (
    <View testID="queued-prompt-row">
      <QueuedRowContent {...row} />
    </View>
  );
}

const queueGrip = (
  <ListDragHandle>
    <Icon name="grip" size="sm" tone="muted" testID="queue-reorder-grip" />
  </ListDragHandle>
);

function QueuedRowContent(row: Row): ReactElement {
  return (
    <ListItem
      id={row.row.id}
      title={promptText(row.row.prompt)}
      subtitle={queueSubtitle(row)}
      role="group"
      leading={queueGrip}
      trailingAccessories={row.editing ? undefined : <EditControls {...row} />}
    />
  );
}

function queueSubtitle(row: Row): string | undefined {
  if (row.error) return row.error;

  return heldSubtitle(row);
}

function heldSubtitle(row: Row): string | undefined {
  if ([row.editing, row.holds.includes(row.row.id)].some(Boolean))
    return 'Editing…';

  return attachmentSummary(row.row.prompt) || undefined;
}
