import { Button, Column, Row, Text, useState } from '@argo/plugin-kit';

function HelloPage() {
  const [taps, setTaps] = useState(0);

  return (
    <Column gap={4}>
      <Text role="heading">Hello from a Plugin</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Row gap={2}>
        <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
        <Button
          label="Say hi"
          variant="outline"
          onPress={{ action: 'toast', message: 'Hello from the Plugin' }}
        />
      </Row>
    </Column>
  );
}

export function register(argo) {
  argo.pages.register('/', HelloPage);
}
