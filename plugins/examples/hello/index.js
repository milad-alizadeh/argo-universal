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

export function register(argo) {
  settings = argo.settings;
  argo.pages.register('/', HelloPage);
}
