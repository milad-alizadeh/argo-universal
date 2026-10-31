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

// A page opened from a Session's header names that Session.
function Heading({ sessionId }) {
  return (
    <>
      <Text>Counter fixture</Text>
      {sessionId ? <Text>{`Opened for Session ${sessionId}`}</Text> : null}
    </>
  );
}

function Counter({ argo, sessionId }) {
  const [taps, setTaps] = useState(0);
  const [view, setView] = useState('counter');

  if (view === 'details') return <Details onBack={() => setView('counter')} />;

  if (view === 'item') return <Item />;

  return (
    <Stack direction="column">
      <Heading sessionId={sessionId} />
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

// The Workbench card's own page: a summary in the card, and the whole of it in the Inspector tab.
function Card({ sessionId }) {
  return (
    <Stack direction="column">
      <Text>Counter card summary</Text>
      {sessionId ? <Text>{`Card for Session ${sessionId}`}</Text> : null}
    </Stack>
  );
}

export function register(argo) {
  argo.pages.register('/', ({ context }) => (
    <Counter argo={argo} sessionId={context.sessionId} />
  ));
  argo.pages.register('/card', ({ context }) => (
    <Card sessionId={context.sessionId} />
  ));
  argo.pages.register('/card/full', () => <Text>Counter card in full</Text>);
  argo.slots.register('argo/project/details/v1', projectRows);
  argo.slots.register('argo/session/row/v1', rowItems);
  argo.slots.register('argo/session/activity/v1', activityLines);
  argo.slots.register('argo/session/bar/v1', barLines);
}

// One Project details row for every Project the items Slot asks about (ADR-0046). A row's title is capped at 40
// characters, so it cannot carry a Project id; the id would push it over and Argo would drop the row.
const projectRows = ({ contexts }) =>
  Object.fromEntries(
    contexts.map(({ projectId }) => [
      projectId,
      [{ title: 'Fixture Slot for this Project' }],
    ]),
  );

// The same one item for every Session an items Slot asks about.
const everySession =
  (item) =>
  ({ contexts }) =>
    Object.fromEntries(contexts.map(({ sessionId }) => [sessionId, [item]]));

// One item on every Session row, which opens the Counter page.
const rowItems = everySession({ text: 'Counter item', action: { path: '/' } });

// An Activity line for every Session, shown only on a Device that picks Counter to write it.
const activityLines = everySession({ text: 'Counter line' });

// Every open Session's bar carries one line that opens the Counter page.
const barLines = everySession({ text: 'Counter bar', action: { path: '/' } });
