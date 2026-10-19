import {
  Button,
  Stack,
  Label,
  Text,
  useEffect,
  useState,
} from '@argo/plugin-kit';

const headingRole = 'heading';

export function ProjectDetails({ context, storage, trackers }) {
  const props = useProjectTracker(storage, context.projectId);

  return (
    <Stack direction="column" gap={2}>
      <TrackerChoices {...props} trackers={trackers} />
    </Stack>
  );
}

function TrackerChoices({ selection, message, choose, trackers }) {
  return (
    <>
      <TrackerHeading />
      <NoneButton selection={selection} choose={choose} />
      <TrackerButtons
        trackers={trackers}
        selection={selection}
        choose={choose}
      />
      {message && <Text>{message}</Text>}
    </>
  );
}

function TrackerButtons({ trackers, selection, choose }) {
  return trackers.map((tracker) => (
    <TrackerButton
      key={tracker.id}
      tracker={tracker}
      selection={selection}
      choose={choose}
    />
  ));
}

function useProjectTracker(storage, projectId) {
  const [selection, setSelection] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    return readProjectTracker({ storage, projectId, setSelection, setMessage });
  }, [projectId, storage]);

  return {
    selection,
    message,
    choose: (id) =>
      saveProjectTracker({ storage, projectId, id, setSelection, setMessage }),
  };
}

function readProjectTracker({ storage, projectId, setSelection, setMessage }) {
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

function setTrackerSelection(id, active, setSelection) {
  if (active) setSelection(id);
}

function setTrackerLoadError(active, setSelection, setMessage) {
  if (!active) return;

  setSelection(null);
  setMessage('Could not load the Tracker choice.');
}

async function saveProjectTracker({
  storage,
  projectId,
  id,
  setSelection,
  setMessage,
}) {
  try {
    await storage.chooseTracker(projectId, id);
    setSelection(id);
    setMessage('');
  } catch {
    setMessage('Could not save the Tracker choice.');
  }
}

function TrackerHeading() {
  return <Text role={headingRole}>Issue tracker</Text>;
}

function NoneButton({ selection, choose }) {
  return (
    <Button
      label="None"
      variant={selection === null ? 'default' : 'outline'}
      disabled={selection === 'loading'}
      onPress={() => choose(null)}
    />
  );
}

function TrackerButton({ tracker, selection, choose }) {
  const selected = selection === tracker.id;

  return (
    <Stack direction="row" gap={2}>
      <Label text={tracker.name} icon={tracker.icon} />
      <Button
        label={`${selected ? 'Selected' : 'Select'} ${tracker.name}`}
        variant={selected ? 'default' : 'outline'}
        disabled={selection === 'loading'}
        onPress={() => choose(tracker.id)}
      />
    </Stack>
  );
}
