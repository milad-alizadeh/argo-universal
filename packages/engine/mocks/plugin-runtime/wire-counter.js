import {
  Button,
  Column,
  Row,
  Text,
  Pill,
  ListItem,
  useState,
} from '@argo/plugin-kit';

function Buttons({ onTap }) {
  return (
    <Row gap={2}>
      <Button label="Tap me" onPress={onTap} />
      <Button
        label="Say hi"
        variant="outline"
        onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
      />
    </Row>
  );
}

function CounterPage() {
  const [taps, setTaps] = useState(0);

  return (
    <Column gap={4}>
      <Text role={headingRole}>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <CounterBadges />
      <Buttons onTap={() => setTaps(taps + 1)} />
    </Column>
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
