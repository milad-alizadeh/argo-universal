import {
  Button,
  Detail,
  Metadata,
  Page,
  Pill,
  Stack,
  Text,
  useState,
} from '@argo/plugin-kit';

function Counter() {
  const [taps, setTaps] = useState(0);
  const [details, setDetails] = useState(false);
  const [item, setItem] = useState(false);

  if (details) return <Details onBack={() => setDetails(false)} />;

  if (item) return <Item />;

  return (
    <Stack direction="column">
      <Text>Counter fixture</Text>
      <Text>{`Tapped ${taps} times`}</Text>
      <Button label="Tap me" onPress={() => setTaps(taps + 1)} />
      <Button label="Open details" onPress={() => setDetails(true)} />
      <Button label="Open item" onPress={() => setItem(true)} />
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

// An item page: Detail with every Metadata field kind.
function Item() {
  return (
    <Page title="Fixture item">
      <Detail
        markdown="Fixture item content."
        metadata={
          <Metadata>
            <Metadata.StatusDot title="Status" text="Open" tone="info" />
            <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
            <Metadata.Pills title="Labels">
              <Pill text="fixture" />
            </Metadata.Pills>
            <Metadata.Label title="Opened" text="Today" />
            <Metadata.Link
              title="Docs"
              text="example.com"
              href="https://example.com/fixture"
            />
          </Metadata>
        }
      />
    </Page>
  );
}

export function register(argo) {
  argo.pages.register('/', Counter);
  argo.slots.register('argo/project/details/v1', ({ context }) => (
    <Text>{`Fixture Slot for ${context.projectId}`}</Text>
  ));
}
