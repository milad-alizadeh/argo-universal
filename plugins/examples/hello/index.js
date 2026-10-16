import { Button, Column, Row, Text, useState } from '@argo/plugin-kit';

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

  return (
    <Column gap={4}>
      <Text variant="heading">Hello from a Plugin</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Buttons onTap={() => setTaps(taps + 1)} />
    </Column>
  );
}

export function register(argo) {
  argo.pages.register('/', HelloPage);
}
