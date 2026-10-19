import { useEffect, useState } from '@argo/plugin-kit';
import type { Setter, TrackerStorage } from './issue-types';

// `loading` until the stored choice arrives; `null` is no Tracker.
export type Selection = string | null;

export type TrackerChoice = {
  selection: Selection;
  message: string;
  choose: (id: string | null) => void;
};

type TrackerSource = { storage: TrackerStorage; projectId: string };

type TrackerState = TrackerSource & {
  setSelection: Setter<Selection>;
  setMessage: Setter<string>;
};

export function useProjectTracker(source: TrackerSource): TrackerChoice {
  const { storage, projectId } = source;
  const [selection, setSelection] = useState<Selection>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    return readProjectTracker({ storage, projectId, setSelection, setMessage });
  }, [projectId, storage]);

  return {
    selection,
    message,
    choose: (id) =>
      saveProjectTracker({ storage, projectId, setSelection, setMessage }, id),
  };
}

function readProjectTracker(state: TrackerState): () => void {
  const { storage, projectId, setSelection, setMessage } = state;
  let active = true;

  setSelection('loading');
  setMessage('');
  void storage.selectedTracker(projectId).then(
    (id) => setTrackerSelection(id, active, setSelection),
    () => setTrackerLoadError(active, setSelection, setMessage),
  );

  return () => {
    active = false;
  };
}

function setTrackerSelection(
  id: Selection,
  active: boolean,
  setSelection: Setter<Selection>,
): void {
  if (active) setSelection(id);
}

function setTrackerLoadError(
  active: boolean,
  setSelection: Setter<Selection>,
  setMessage: Setter<string>,
): void {
  if (!active) return;

  setSelection(null);
  setMessage('Could not load the Tracker choice.');
}

async function saveProjectTracker(
  state: TrackerState,
  id: Selection,
): Promise<void> {
  try {
    await state.storage.chooseTracker(state.projectId, id);
    state.setSelection(id);
    state.setMessage('');
  } catch {
    state.setMessage('Could not save the Tracker choice.');
  }
}
