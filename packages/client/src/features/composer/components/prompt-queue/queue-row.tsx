import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { TextArea } from '@repo/kit/primitives/controls/text-area';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { attachmentLabels, promptText } from './queue-content';
import { EditControls, OrderControls } from './queue-controls';
import type { QueueRowProps } from './queue-types';
import { useQueueRow, type QueueRow as Row } from './use-queue-row';

export function QueueRow(props: QueueRowProps): ReactElement {
  const row = useQueueRow(props);

  return (
    <View
      role="group"
      accessibilityLabel={promptText(row.row.prompt)}
      className="py-2 gap-2 border-t border-border"
    >
      {row.editing ? <QueueEditor {...row} /> : <QueuedContent {...row} />}
      {row.error && <Text tone="danger">{row.error}</Text>}
    </View>
  );
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

function QueuedContent(row: Row): ReactElement {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 min-w-0">
        <QueuePreview {...row} />
      </View>
      <View className="flex-row shrink-0">
        <OrderControls {...row} />
        <EditControls {...row} />
      </View>
    </View>
  );
}

function QueuePreview({ row, holds }: Row): ReactElement {
  return (
    <>
      <Text numberOfLines={3}>{promptText(row.prompt)}</Text>
      <Text tone="muted">{attachmentLabels(row.prompt)}</Text>
      {holds.includes(row.id) && <Text tone="muted">Editing…</Text>}
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
