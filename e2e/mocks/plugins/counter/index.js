import { Button, Column, Text, useState } from '@argo/plugin-kit';

function Counter() {
  const [taps, setTaps] = useState(0);
  const [details, setDetails] = useState(false);

  if (details) return <Details onBack={() => setDetails(false)} />;

  return (
    <Column>
      <Text>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
      <Button label="Open details" onPress={() => setDetails(true)} />
    </Column>
  );
}

function Details({ onBack }) {
  return (
    <Column>
      <Button label="Back to counter" onPress={onBack} />
      <Text>Fixture details drawn by the App.</Text>
      <Button
        label="Open documentation"
        onPress={{ action: 'openUrl', url: 'https://example.com/fixture' }}
      />
    </Column>
  );
}

export function register(argo) {
  argo.pages.register('/', Counter);
  argo.slots.register('argo/project/details/v1', ({ context }) => (
    <Text>{`Fixture Slot for ${context.projectId}`}</Text>
  ));
}
