import type { QueueCommand } from '@repo/contracts';
import { useState } from 'react';
import type { PromptQueueProps } from './queue-types';

type ActionState = { pending: boolean; error: string | null };

const idleAction: ActionState = { pending: false, error: null };

type SetState = (state: ActionState) => void;

type Work = () => Promise<void>;

type QueueAction = ActionState & {
  run: (command: QueueCommand, done?: () => void) => void;
  perform: (work: Work) => void;
};

export function useQueueAction(
  command: PromptQueueProps['command'],
): QueueAction {
  const [state, setState] = useState<ActionState>(idleAction);

  return { ...state, ...queueActions(command, setState) };
}

function queueActions(
  command: PromptQueueProps['command'],
  setState: SetState,
): Pick<QueueAction, 'run' | 'perform'> {
  return {
    run: (action, done) =>
      perform(setState, async () => {
        await command(action);
        done?.();
      }),
    perform: (work) => perform(setState, work),
  };
}

function perform(setState: SetState, work: Work): void {
  setState({ pending: true, error: null });
  void work()
    .then(() => setState(idleAction))
    .catch((error: Error) =>
      setState({ pending: false, error: error.message }),
    );
}
