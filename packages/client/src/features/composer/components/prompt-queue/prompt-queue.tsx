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
    <View
      testID="prompt-queue"
      className="w-full rounded-t-2xl bg-card p-3 gap-2"
    >
      <QueueHeading {...props} />
      <QueueRows {...props} />
    </View>
  );
}

function QueueHeading({ queue, command }: PromptQueueProps): ReactElement {
  return (
    <>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text>Queued Prompts</Text>
        {queue.pauseReason && <ResumeQueue command={command} />}
      </View>
      {queue.pauseReason && <Text tone="muted">{queue.pauseReason}</Text>}
    </>
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
