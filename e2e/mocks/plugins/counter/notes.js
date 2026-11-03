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
    watcher();

    return () => {
      watchers.delete(watcher);
    };
  }, [sessionId]);

  return on;
}

// A card with nothing to show returns null, and Argo draws no card, tab or header action for it.
export function NotesCard({ sessionId }) {
  if (!useFilled(sessionId)) return null;

  return <Text>Notes card summary</Text>;
}

// Fills or empties the Notes card from the Counter card's tab, as a Plugin's data would change under it.
export function NotesSwitch({ sessionId }) {
  const on = useFilled(sessionId);

  return (
    <Stack direction="column">
      <Text>Counter card in full</Text>
      <Button
        label={on ? 'Empty the Notes card' : 'Fill the Notes card'}
        onPress={() => setFilled(sessionId, !on)}
      />
    </Stack>
  );
}
