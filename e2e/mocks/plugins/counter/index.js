import { Button, Stack, Text, useEffect, useState } from '@argo/plugin-kit';
import { Item } from './item.js';

const sessionDraft = '#7 Keep %2F in paths\nhttps://example.com/fixture/7';

// Opens New Session in the first Project with a draft in the Composer.
function StartSession({ argo }) {
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    void argo.projects.list().then((projects) => {
      setProjectId(projects[0]?.id ?? null);
    });
  }, [argo]);

  if (!projectId) return null;

  return (
    <Button
      label="Start Session"
      onPress={{ action: 'newSession', projectId, draft: sessionDraft }}
    />
  );
}

function Counter({ argo }) {
  const [taps, setTaps] = useState(0);
  const [view, setView] = useState('counter');

  if (view === 'details') return <Details onBack={() => setView('counter')} />;

  if (view === 'item') return <Item />;

  return (
    <Stack direction="column">
      <Text>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
      <Views setView={setView} />
      <StartSession argo={argo} />
    </Stack>
  );
}

function Views({ setView }) {
  return (
    <>
      <Button label="Open details" onPress={() => setView('details')} />
      <Button label="Open item" onPress={() => setView('item')} />
    </>
  );
}

function Details({ onBack }) {
  return (
    <Stack direction="column">
      <Button label="Back to counter" onPress={onBack} />
      <Text>Fixture details drawn by the App.</Text>
      <Button
        label="Open documentation"
        onPress={{ action: 'openUrl', url: 'https://example.com/fixture' }}
      />
    </Stack>
  );
}

export function register(argo) {
  argo.pages.register('/', () => <Counter argo={argo} />);
  argo.slots.register('argo/project/details/v1', ({ context }) => (
    <Text>{`Fixture Slot for ${context.projectId}`}</Text>
  ));
  // One item on every Session row, which opens the Counter page.
  argo.slots.register('argo/session/row/v1', ({ contexts }) =>
    Object.fromEntries(
      contexts.map(({ sessionId }) => [
        sessionId,
        [{ text: 'Counter item', action: { path: '/' } }],
      ]),
    ),
  );
}
