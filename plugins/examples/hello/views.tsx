import {
  Screen,
  SegmentedControl,
  Stack,
  Text,
  useState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

const views = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

export function HelloViews(): JSX.Element {
  const [view, setView] = useState('open');

  return (
    <Screen title="Issue views">
      <ViewContent value={view} onValueChange={setView} />
    </Screen>
  );
}

function ViewContent(props: {
  value: string;
  onValueChange: (value: string) => void;
}): JSX.Element {
  return (
    <Stack direction="column" gap={4}>
      <SegmentedControl label="Issue view" options={views} {...props} />
      <Text>{props.value === 'open' ? 'Open Issue' : 'Closed Issue'}</Text>
    </Stack>
  );
}
