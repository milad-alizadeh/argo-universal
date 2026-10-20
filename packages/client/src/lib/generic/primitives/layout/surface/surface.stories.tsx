import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Variation, Variations as VariationList } from '../../../variations';
import { Surface } from './surface';

const meta = {
  title: 'Design System/Primitives/Layout/Surface',
  component: Surface,
  args: { kind: 'card' },
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

const kinds = ['background', 'card', 'muted', 'glass'] as const;

export const Variations: Story = {
  name: 'Surface',
  render: () => (
    <VariationList>
      {kinds.map(kindVariation)}
      <Variation label="Padding">
        <Padding />
      </Variation>
      <Variation label="Press and context actions">
        <InteractiveSurface />
      </Variation>
    </VariationList>
  ),
};

function Padding(): React.JSX.Element {
  return (
    <Stack direction="column" gap={3}>
      {([3, 4, 6] as const).map((padding) => (
        <Surface key={padding} kind="card" padding={padding}>
          <Text>Padding {padding}</Text>
        </Surface>
      ))}
    </Stack>
  );
}

function InteractiveSurface(): React.JSX.Element {
  const [status, setStatus] = useState('Press the surface');

  const actions = archiveActions(() => setStatus('Archived'));

  return (
    <Surface
      kind="card"
      padding={4}
      onPress={() => setStatus('Pressed')}
      actions={actions}
    >
      <Text>{status}</Text>
    </Surface>
  );
}

function kindVariation(kind: (typeof kinds)[number]): React.JSX.Element {
  return (
    <Variation key={kind} label={kind}>
      <Surface kind={kind} padding={4}>
        <Text>{kind}</Text>
      </Surface>
    </Variation>
  );
}

function archiveActions(onArchive: () => void): React.JSX.Element {
  return (
    <ActionList>
      <Action icon="archive" label="Archive" onPress={onArchive} />
    </ActionList>
  );
}
