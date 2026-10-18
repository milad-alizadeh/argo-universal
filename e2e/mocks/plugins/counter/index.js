import { Button, Column, Text, useState } from '@argo/plugin-kit';

function Counter() {
  const [taps, setTaps] = useState(0);

  return (
    <Column>
      <Text>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
    </Column>
  );
}

export function register(argo) {
  argo.pages.register('/', Counter);
  argo.slots.register('argo/project/details/v1', ({ context }) => (
    <Text>{`Fixture Slot for ${context.projectId}`}</Text>
  ));
}
