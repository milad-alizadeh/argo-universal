import { Button } from '@repo/kit/primitives/actions/button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { TextArea } from '@repo/kit/primitives/controls/text-area';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { attachmentLabels, promptText } from './queue-content';
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
  <Icon name="reorder" size="sm" tone="muted" testID="queue-reorder-grip" />
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
      control={row.editing ? <QueueEditor {...row} /> : undefined}
    />
  );
}

function queueSubtitle(row: Row): string | undefined {
  if (row.error) return row.error;

  return heldSubtitle(row);
}

function heldSubtitle(row: Row): string | undefined {
  if (row.holds.includes(row.row.id)) return 'Editing…';

  return attachmentLabels(row.row.prompt) || undefined;
}

function QueueEditor(row: Row): ReactElement {
  return (
    <>
      <TextArea
        label="Edit Queued Prompt"
        value={row.text}
        onChangeText={row.changeText}
        disabled={row.pending}
      />
      <EditorActions {...row} />
    </>
  );
}

function EditorActions(row: Row): ReactElement {
  return (
    <View className="flex-row gap-2">
      <SaveEdit {...row} />
      <CancelEdit {...row} />
    </View>
  );
}

function SaveEdit(row: Row): ReactElement {
  return (
    <Button
      label="Save"
      size="sm"
      disabled={row.pending || !row.text.trim()}
      onPress={row.save}
    />
  );
}

function CancelEdit(row: Row): ReactElement {
  return (
    <Button
      label="Cancel"
      size="sm"
      variant="text"
      disabled={row.pending}
      onPress={row.cancel}
    />
  );
}
