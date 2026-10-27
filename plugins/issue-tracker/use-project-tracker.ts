import { useCallback, useState } from '@argo/plugin-kit';
import type { TrackerStorage } from './tracker-storage';
import { useAsync, type Async } from './use-async';

// A Tracker's id, or `null` for none.
type Selection = string | null;

// `selection` is `undefined` until the stored choice arrives.
export type TrackerChoice = {
  selection: Selection | undefined;
  message: string;
  choose: (id: string | null) => Promise<void>;
};

type TrackerSource = { storage: TrackerStorage; projectId: string };

export function useProjectTracker(source: TrackerSource): TrackerChoice {
  const stored = useStoredTracker(source);
  const { saveMessage, choose } = useTrackerSave(source, stored.set);
  const failed = stored.error !== undefined;

  return {
    selection: failed ? null : stored.value,
    message: failed ? 'Could not load the Tracker choice.' : saveMessage,
    choose,
  };
}

function useStoredTracker({
  storage,
  projectId,
}: TrackerSource): Async<Selection> {
  return useAsync(
    useCallback(() => storage.selectedTracker(projectId), [storage, projectId]),
  );
}

type TrackerSave = Pick<TrackerChoice, 'choose'> & { saveMessage: string };

function useTrackerSave(
  source: TrackerSource,
  set: Async<Selection>['set'],
): TrackerSave {
  const [saveMessage, setSaveMessage] = useState('');

  const choose = async (id: Selection): Promise<void> =>
    setSaveMessage(await saveChoice(source, id, () => set(() => id)));

  return { saveMessage, choose };
}

// The message a save leaves: none, or why it failed.
async function saveChoice(
  { storage, projectId }: TrackerSource,
  id: Selection,
  saved: () => void,
): Promise<string> {
  try {
    await storage.chooseTracker(projectId, id);
    saved();

    return '';
  } catch {
    return 'Could not save the Tracker choice.';
  }
}
