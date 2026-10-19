import { Button, Stack, Text, useState } from '@argo/plugin-kit';

function Counter() {
  const [taps, setTaps] = useState(0);
  const [details, setDetails] = useState(false);

  if (details) return <Details onBack={() => setDetails(false)} />;

  return (
    <Stack direction="column">
      <Text>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
      <Button label="Open details" onPress={() => setDetails(true)} />
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

export function register(argo) {
  argo.pages.register('/', Counter);
  argo.slots.register('argo/project/details/v1', ({ context }) => (
    <Text>{`Fixture Slot for ${context.projectId}`}</Text>
  ));
}
