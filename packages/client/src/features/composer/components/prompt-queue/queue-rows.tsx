import type { ListMove } from '@repo/contracts/kit-moves';
import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement } from 'react';
import { QueueRow } from './queue-row';
import type { PromptQueueProps } from './queue-types';

export function QueueRows(props: PromptQueueProps): ReactElement {
  return (
    <List
      appearance="plain"
      density="compact"
      fitHeight={240}
      padding={0}
      onMove={(move) => movePrompt(props, move)}
    >
      {props.queue.items.map((row, index) => (
        <QueueRow key={row.id} id={row.id} {...props} row={row} index={index} />
      ))}
    </List>
  );
}

async function movePrompt(
  props: PromptQueueProps,
  move: ListMove,
): Promise<void> {
  const row = props.queue.items.find((item) => item.id === move.id);

  if (props.holds.length > 0)
    throw new Error('Prompt cannot be moved while editing');

  if (!row) return;

  await sendMove(props, row, move.index);
}

async function sendMove(
  props: PromptQueueProps,
  row: PromptQueueProps['queue']['items'][number],
  index: number,
): Promise<void> {
  const remaining = props.queue.items.filter((item) => item.id !== row.id);
  await props.command({
    action: 'move',
    id: row.id,
    revision: row.revision,
    beforeId: beforeId(remaining, index),
  });
}

function beforeId(
  items: PromptQueueProps['queue']['items'],
  index: number,
): PromptQueueProps['queue']['items'][number]['id'] | null {
  return items[index]?.id ?? null;
}
