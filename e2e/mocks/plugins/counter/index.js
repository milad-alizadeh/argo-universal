import { Button, Stack, Text } from '@argo/plugin-kit';
import { Item } from './item.js';

const sessionDraft = '#7 Keep %2F in paths\nhttps://example.com/fixture/7';

// Opens New Session in the first Project with a draft in the Composer.
function StartSession({ projectId }) {
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

// The count and the view shown are Page state, so a tap draws the page again with one more.
function Counter({ projectId, sessionId, state, to }) {
  if (state.view === 'details')
    return <Details onBack={to.set({ view: 'counter' })} />;

  if (state.view === 'item') return <Item />;

  return (
    <Stack direction="column">
      <Heading sessionId={sessionId} />
      <Text>{`Tapped ${state.taps} times`}</Text>
      <Button label="Tap me" onPress={to.set({ taps: state.taps + 1 })} />
      <Button label="Open details" onPress={to.set({ view: 'details' })} />
      <Button label="Open item" onPress={to.set({ view: 'item' })} />
      <StartSession projectId={projectId} />
    </Stack>
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

function defineCounter(argo) {
  argo.pages.define('/', {
    state: { taps: 0, view: 'counter' },
    load: async () => (await argo.projects.list())[0]?.id ?? null,
    render: (projectId, to, { state, context }) => (
      <Counter
        projectId={projectId}
        sessionId={context.sessionId}
        state={state}
        to={to}
      />
    ),
  });
}

// The Workbench card's own Loader page: a summary in the card, and the whole of it in the Inspector tab.
function Card({ sessionId }) {
  return (
    <Stack direction="column">
      <Text>Counter card summary</Text>
      {sessionId ? <Text>{`Card for Session ${sessionId}`}</Text> : null}
    </Stack>
  );
}

function defineCard(argo) {
  argo.pages.define('/card', {
    load: () => null,
    render: (_data, _to, { context }) => <Card sessionId={context.sessionId} />,
  });
  argo.pages.define('/card/full', {
    load: () => null,
    render: () => <Text>Counter card in full</Text>,
  });
}

export function register(argo) {
  defineCounter(argo);
  defineCard(argo);
  argo.slots.register('argo/project/details/v1', projectRows);
  argo.slots.register('argo/session/row/v1', rowItems);
  argo.slots.register('argo/session/activity/v1', activityLines);
  argo.slots.register('argo/session/bar/v1', barLines);
}

/*
 * One Project details row for every Project the items Slot asks about (ADR-0046). A row's title is capped at 40
 * characters, so it cannot carry a Project id; the id would push it over and Argo would drop the row.
 */
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
