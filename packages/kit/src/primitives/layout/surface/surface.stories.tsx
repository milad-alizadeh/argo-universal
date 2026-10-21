import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Surface } from './surface';

const meta = {
  title: 'Design System/Primitives/Layout/Surface',
  component: Surface,
  argTypes: kitArgTypes('Surface'),
  args: { kind: 'card', padding: 4, children: <Text>card</Text> },
} satisfies Meta<typeof Surface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Background: Story = {
  args: { kind: 'background', children: <Text>background</Text> },
};

export const Card: Story = { args: { kind: 'card' } };

export const Muted: Story = {
  args: { kind: 'muted', children: <Text>muted</Text> },
};

export const Glass: Story = {
  args: { kind: 'glass', children: <Text>glass</Text> },
};

export const TightPadding: Story = {
  args: { padding: 3, children: <Text>Padding 3</Text> },
};

export const LoosePadding: Story = {
  args: { padding: 6, children: <Text>Padding 6</Text> },
};

// The pressed and archived copy is live, so this state keeps its own render.
export const Pressable: Story = {
  render: () => <InteractiveSurface />,
  parameters: {
    docs: {
      description: {
        story: 'Press the Surface, or open its context actions.',
      },
    },
  },
};

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

function archiveActions(onArchive: () => void): React.JSX.Element {
  return (
    <ActionList>
      <Action icon="archive" label="Archive" onPress={onArchive} />
    </ActionList>
  );
}
