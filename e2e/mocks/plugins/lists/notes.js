import { Button, Stack, Text, useEffect, useState } from '@argo/plugin-kit';

// The Sessions whose Notes card has something to show; every page of the Plugin's one process reads the same set.
const filled = new Set();

const watchers = new Set();

const setFilled = (sessionId, on) => {
  if (on) filled.add(sessionId);
  else filled.delete(sessionId);

  for (const watcher of watchers) watcher();
};

function useFilled(sessionId) {
  const [on, setOn] = useState(filled.has(sessionId));

  useEffect(() => {
    const watcher = () => setOn(filled.has(sessionId));

    watchers.add(watcher);

    return () => {
      watchers.delete(watcher);
    };
  }, [sessionId]);

  return on;
}

// A card with nothing to show returns null, and Argo draws no card, tab or header action for it.
function NotesCard({ sessionId }) {
  if (!useFilled(sessionId)) return null;

  return <Text>Notes card summary</Text>;
}

// Fills or empties the Session's Notes card, as a Plugin's data would change under it; a header action opens it.
function NotesSwitch({ sessionId }) {
  const [on, setOn] = useState(filled.has(sessionId));

  const toggle = () => {
    setFilled(sessionId, !on);
    setOn(!on);
  };

  const label = on ? 'Empty the Notes card' : 'Fill the Notes card';

  return (
    <Stack direction="column">
      <Text>Notes switch</Text>
      <Button label={label} onPress={toggle} />
    </Stack>
  );
}

export function registerNotes(pages) {
  pages.register('/notes', ({ context }) => (
    <NotesCard sessionId={context.sessionId} />
  ));
  pages.register('/notes/full', () => <Text>Notes in full</Text>);
  pages.register('/lists/notes-switch', ({ context }) => (
    <NotesSwitch sessionId={context.sessionId} />
  ));
}
