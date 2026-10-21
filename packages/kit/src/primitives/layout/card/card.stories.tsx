import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Grid } from '#primitives/layout/grid';
import { Stack } from '#primitives/layout/stack';
import { Pill } from '#primitives/status/pill';
import { Svg } from '#primitives/visual';
import { Card } from './card';

const moreButton = (
  <IconButton icon="more" variant="ghost" accessibilityLabel="More" />
);

const deployBody = (
  <Stack direction="column" gap={2} align="start">
    <Text>Deployed 12 min ago by Ana Ruiz</Text>
    <Pill tone="success" text="Healthy" />
  </Stack>
);

const deployCard = (
  <Card title="api-gateway" subtitle="Production" actions={moreButton}>
    {deployBody}
  </Card>
);

const workerCard = (
  <Card
    icon={<Icon role="row" name="server" />}
    title="worker"
    subtitle="Staging"
  >
    <Text>Deployed 2 hours ago by Sam Lee</Text>
  </Card>
);

const meta = {
  title: 'Design System/Primitives/Layout/Card',
  component: Card,
  argTypes: kitArgTypes('Card'),
  args: { title: 'api-gateway' },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {};

// The unrelated example from the Paper master: a deploy status card.
export const Anatomy: Story = {
  args: {
    subtitle: 'Production',
    actions: moreButton,
    children: deployBody,
  },
};

export const Media: Story = {
  args: {
    media: <Svg xml={serviceMap()} label="Service map" />,
    title: 'Service map',
    subtitle: '12 services',
    children: <Text>Updated after the last deploy.</Text>,
  },
};

// The press count is live, so this state keeps its own render.
export const Pressable: Story = { render: () => <PressableCard /> };

// Cards in one row share the tallest one's height, so this state draws the row.
export const InAGrid: Story = {
  render: () => (
    <Grid columns={3} gap={3}>
      {deployCard}
      {workerCard}
      <Card icon={<Icon role="row" name="web" />} title="web" />
    </Grid>
  ),
};

function PressableCard(): React.JSX.Element {
  const [opened, setOpened] = useState(0);

  return (
    <Card
      icon={<Icon role="row" name="activity" />}
      title="Builds"
      subtitle={`Opened ${opened} times`}
      onPress={() => setOpened((count) => count + 1)}
    >
      <Text>Press the card to open its builds.</Text>
    </Card>
  );
}

function serviceMap(): string {
  const fixture = fixtures.valid[0];

  if (!fixture) throw new Error('Missing valid SVG fixture');

  return fixture.xml;
}
