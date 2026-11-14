import { LegendList, type LegendListProps } from '@legendapp/list/react-native';
import type { QueuedPrompt } from '@repo/contracts';
import { useState, type ReactElement } from 'react';
import { QueueRow } from './queue-row';
import type { PromptQueueProps } from './queue-types';

const maximumHeight = 240;

export function QueueRows(props: PromptQueueProps): ReactElement {
  const [height, setHeight] = useState(maximumHeight);

  return (
    <LegendList {...queueListProps(props, setHeight)} style={{ height }} />
  );
}

function queueListProps(
  props: PromptQueueProps,
  setHeight: (height: number) => void,
): LegendListProps<QueuedPrompt> {
  return {
    data: props.queue.items,
    keyExtractor: (row) => row.id,
    renderItem: ({ item, index }) => (
      <QueueRow {...props} row={item} index={index} />
    ),
    onContentSizeChange: (_width, contentHeight) =>
      setHeight(Math.min(maximumHeight, contentHeight)),
    keyboardShouldPersistTaps: 'handled',
  };
}
