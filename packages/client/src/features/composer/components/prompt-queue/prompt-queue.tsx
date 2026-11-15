import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { QueueEditorsProvider } from './queue-editors';
import { QueueRows } from './queue-rows';
import type { PromptQueueProps } from './queue-types';

export type { PromptQueueProps } from './queue-types';

export function PromptQueue(props: PromptQueueProps): ReactElement | null {
  if (!props.queue.items.length) return null;

  return (
    <QueueEditorsProvider command={props.command}>
      <QueueSurface {...props} />
    </QueueEditorsProvider>
  );
}

function QueueSurface(props: PromptQueueProps): ReactElement {
  return (
    <View testID="prompt-queue" className="w-full px-3 py-2">
      {props.queue.pauseReason && <QueueHeading {...props} />}
      <QueueRows {...props} />
    </View>
  );
}

function QueueHeading({ queue, command }: PromptQueueProps): ReactElement {
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <Text tone="muted">{queue.pauseReason}</Text>
      <ResumeQueue command={command} />
    </View>
  );
}

function ResumeQueue({
  command,
}: Pick<PromptQueueProps, 'command'>): ReactElement {
  return (
    <Button
      label="Resume queue"
      size="sm"
      onPress={() => void command({ action: 'resume' }).catch(() => {})}
    />
  );
}
