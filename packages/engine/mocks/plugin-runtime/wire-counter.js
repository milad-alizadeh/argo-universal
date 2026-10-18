import {
  Button,
  Stack,
  Text,
  Pill,
  ListItem,
  useState,
} from '@argo/plugin-kit';

function Buttons({ onTap }) {
  return (
    <Stack direction="row" gap={2}>
      <Button label="Tap me" onPress={onTap} />
      <Button
        label="Say hi"
        variant="outline"
        onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
      />
    </Stack>
  );
}

function CounterPage() {
  const [taps, setTaps] = useState(0);

  return (
    <Stack direction="column" gap={4}>
      <Text role={headingRole}>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <CounterBadges />
      <Buttons onTap={() => setTaps(taps + 1)} />
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

export function register(argo) {
  argo.pages.register('/', CounterPage);
}
