import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import { QueueRow } from './queue-row';
import type { PromptQueueProps } from './queue-types';

export type { PromptQueueProps } from './queue-types';

export function PromptQueue(props: PromptQueueProps): ReactElement | null {
  if (!props.queue.items.length) return null;

  return <QueueSurface {...props} />;
}

function QueueSurface(props: PromptQueueProps): ReactElement {
  return (
    <View
      testID="prompt-queue"
      className="w-full rounded-t-2xl bg-card p-3 gap-2"
    >
      <QueueHeading {...props} />
      <ScrollView className="max-h-60" keyboardShouldPersistTaps="handled">
        {props.queue.items.map((row, index) => (
          <QueueRow key={row.id} {...props} row={row} index={index} />
        ))}
      </ScrollView>
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
