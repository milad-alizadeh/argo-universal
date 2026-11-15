import type { ReactElement } from 'react';
import { Composer } from '../composer/composer';
import { useQueueExample } from './queue-example.mocks';
import type { PromptQueueProps } from './queue-types';

const draft = { text: 'Keep my existing draft', attachments: [] };

export function QueueComposerExample(props: PromptQueueProps): ReactElement {
  const queue = useQueueExample(props);

  return (
    <Composer
      draft={draft}
      onDraftChange={() => {}}
      onSend={() => {}}
      onAttachImages={() => {}}
      promptQueue={queue}
    />
  );
}
