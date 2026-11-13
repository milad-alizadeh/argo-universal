import { type JSX, useState } from 'react';
import { fn } from 'storybook/test';
import type { ChangeActions, SessionPullRequest } from '#features/sessions';
import { repositoryChanges } from '../../../features/sessions/components/session-pull-request.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { withPullRequests } from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

// A test-only harness: the Changes the Plugins supplied move on, as the Slot's refresh and a detach make them move.
export const attached = fn<(reference: string) => Promise<boolean>>(() =>
  Promise.resolve(true),
);

export const detached = fn<(change: SessionPullRequest) => Promise<boolean>>();

const refreshLabel = 'Refresh Changes (harness)';

const reorderLabel = 'Reverse Changes (harness)';

const removeLabel = 'Remove first Change (harness)';

const restoreLabel = 'Restore all Changes (harness)';

export const harness = {
  refreshLabel,
  reorderLabel,
  removeLabel,
  restoreLabel,
};

type Move = (changes: SessionPullRequest[]) => SessionPullRequest[];

const reversed: Move = (changes) => [...changes].reverse();

const withoutFirst: Move = (changes) => changes.slice(1);

// The same Changes as new objects, which is what each refresh answers.
const refreshed: Move = (changes) => changes.map((change) => ({ ...change }));

function Controls(props: {
  move: (move: Move) => void;
  restore: () => void;
}): JSX.Element {
  return (
    <>
      <button type="button" onClick={() => props.move(refreshed)}>
        {refreshLabel}
      </button>
      <button type="button" onClick={() => props.move(reversed)}>
        {reorderLabel}
      </button>
      <button type="button" onClick={() => props.move(withoutFirst)}>
        {removeLabel}
      </button>
      <button type="button" onClick={props.restore}>
        {restoreLabel}
      </button>
    </>
  );
}

// The Session page with its Changes held in state, and a detach that removes only the Change it names.
export function ChangingSession(props: {
  initial?: readonly SessionPullRequest[];
  // Replaces the harness's own attach and detach, as when the App's Operations run.
  actions?: ChangeActions;
}): JSX.Element {
  const all =
    props.initial ?? repositoryChanges.map((change) => ({ ...change }));

  const [changes, setChanges] = useState(all);

  const view = withPullRequests(idleSession, [...changes]);

  const changeActions = {
    attach: attached,
    detach: async (change: SessionPullRequest): Promise<boolean> => {
      await detached(change);
      setChanges((now) => now.filter((one) => one.id !== change.id));

      return true;
    },
  };

  return (
    <>
      <FramedSessionPreview
        state="open"
        {...view}
        changeActions={props.actions ?? changeActions}
      />
      <Controls
        move={(move) => setChanges((now) => move([...now]))}
        restore={() => setChanges(all.map((change) => ({ ...change })))}
      />
    </>
  );
}
