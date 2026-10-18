import {
  Button,
  Column,
  Row,
  Text,
  useEffect,
  useState,
} from '@argo/plugin-kit';

let settings;

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

function HelloPage() {
  const [taps, setTaps] = useState(0);
  const [greeting, setGreeting] = useState('Hello from a Plugin');

  // Read on each open, so a changed setting shows the next time the page opens.
  useEffect(() => {
    void settings.get('greeting').then((value) => value && setGreeting(value));
  }, []);

  return (
    <Column gap={4}>
      <Text variant="heading">{greeting}</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Buttons onTap={() => setTaps(taps + 1)} />
    </Column>
  );
}

const greeting = (projectId, waves) =>
  waves === 0
    ? `Hello from ${projectId}`
    : `Waved at ${projectId} ${waves} times`;

// Project details' Slot: `context` is frozen and holds only the Project id.
function ProjectDetails({ context }) {
  const [waves, setWaves] = useState(0);

  return (
    <Column gap={2}>
      <Text>{greeting(context.projectId, waves)}</Text>
      <Button
        label="Wave"
        variant="outline"
        onPress={() => setWaves(waves + 1)}
      />
    </Column>
  );
}

export function register(argo) {
  settings = argo.settings;
  argo.pages.register('/', HelloPage);
  argo.slots.register('argo/project/details/v1', ProjectDetails);
}
