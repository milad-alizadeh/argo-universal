import type { QueueCommand } from '@repo/contracts';
import { useState } from 'react';
import type { PromptQueueProps } from './queue-types';

type ActionState = { pending: boolean; error: string | null };

const idleAction: ActionState = { pending: false, error: null };

type SetState = (state: ActionState) => void;

type QueueAction = ActionState & {
  run: (command: QueueCommand, done?: () => void) => void;
};

export function useQueueAction(
  command: PromptQueueProps['command'],
): QueueAction {
  const [state, setState] = useState<ActionState>(idleAction);

  const run: QueueAction['run'] = (action, done): void => {
    setState({ pending: true, error: null });
    void command(action)
      .then(() => finishAction(setState, done))
      .catch((error: Error) =>
        setState({ pending: false, error: error.message }),
      );
  };

  return { ...state, run };
}

function finishAction(
  setState: SetState,
  done: (() => void) | undefined,
): void {
  setState({ pending: false, error: null });
  done?.();
}
