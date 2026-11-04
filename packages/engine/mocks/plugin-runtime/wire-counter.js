import { Button, Stack, Text, Pill, ListItem } from '@argo/plugin-kit';

function Buttons({ next }) {
  return (
    <Stack direction="row" gap={2}>
      <Button label="Tap me" onPress={next} />
      <Button
        label="Say hi"
        variant="secondary"
        onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
      />
    </Stack>
  );
}

function CounterBadges() {
  return (
    <>
      <Pill text="Healthy" tone="success" />
      <ListItem
        title="Waiting jobs"
        badge={{ kind: 'count', count: 3, label: '3 queued jobs' }}
      />
    </>
  );
}

const headingRole = 'heading';

// The taps live in the Page state, so a tap draws the next address.
function CounterPage({ taps, to }) {
  return (
    <Stack direction="column" gap={4}>
      <Text role={headingRole}>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <CounterBadges />
      <Buttons next={to.set({ taps: taps + 1 })} />
    </Stack>
  );
}

export function register(argo) {
  argo.pages.define('/', {
    state: { taps: 0 },
    load: ({ state }) => state.taps,
    render: (taps, to) => <CounterPage taps={taps} to={to} />,
  });
}
