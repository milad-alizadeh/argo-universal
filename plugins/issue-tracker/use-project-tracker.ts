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

// A save's message belongs to the Project it was saved for; another Project starts without one.
type SaveResult = { projectId: string; message: string };

function useTrackerSave(
  source: TrackerSource,
  set: Async<Selection>['set'],
): TrackerSave {
  const [result, setResult] = useState<SaveResult>({
    projectId: source.projectId,
    message: '',
  });

  const choose = async (id: Selection): Promise<void> =>
    setResult(await savedResult(source, id, () => set(() => id)));

  const own = result.projectId === source.projectId;

  return { saveMessage: own ? result.message : '', choose };
}

async function savedResult(
  source: TrackerSource,
  id: Selection,
  saved: () => void,
): Promise<SaveResult> {
  return {
    projectId: source.projectId,
    message: await saveChoice(source, id, saved),
  };
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
