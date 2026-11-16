import type { ReactElement } from 'react';
import { View } from 'react-native';
import { QueueRows } from './queue-rows';
import type { PromptQueueProps } from './queue-types';

export type { PromptQueueProps } from './queue-types';

export function PromptQueue(props: PromptQueueProps): ReactElement | null {
  if (!props.queue.items.length) return null;

  return <QueueSurface {...props} />;
}

function QueueSurface(props: PromptQueueProps): ReactElement {
  return (
    <View testID="prompt-queue" className="w-full">
      <QueueRows {...props} />
    </View>
  );
}
