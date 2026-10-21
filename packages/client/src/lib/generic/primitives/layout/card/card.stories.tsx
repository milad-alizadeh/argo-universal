import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Grid } from '#primitives/layout/grid';
import { Stack } from '#primitives/layout/stack';
import { Pill } from '#primitives/status/pill';
import { Svg } from '#primitives/visual';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Card } from './card';

const meta = {
  title: 'Design System/Primitives/Layout/Card',
  component: Card,
  argTypes: kitArgTypes('Card'),
  args: { title: 'api-gateway' },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Card',
  render: () => (
    <VariationList>
      {variations.map(([label, card]) => (
        <Variation key={label} label={label}>
          {card}
        </Variation>
      ))}
    </VariationList>
  ),
};

function MediaCard(): React.JSX.Element {
  return (
    <Card
      media={<Svg xml={serviceMap()} label="Service map" />}
      title="Service map"
      subtitle="12 services"
    >
      <Text>Updated after the last deploy.</Text>
    </Card>
  );
}

// Cards in one row share the tallest one's height.
function CardGrid(): React.JSX.Element {
  return (
    <Grid columns={3} gap={3}>
      <DeployCard />
      <Card
        icon={<Icon role="row" name="server" />}
        title="worker"
        subtitle="Staging"
      >
        <Text>Deployed 2 hours ago by Sam Lee</Text>
      </Card>
      <Card icon={<Icon role="row" name="web" />} title="web" />
    </Grid>
  );
}

// The unrelated example from the Paper master: a deploy status card.
function DeployCard(): React.JSX.Element {
  return (
    <Card title="api-gateway" subtitle="Production" actions={moreButton}>
      <Stack direction="column" gap={2} align="start">
        <Text>Deployed 12 min ago by Ana Ruiz</Text>
        <Pill tone="success" text="Healthy" />
      </Stack>
    </Card>
  );
}

const moreButton = (
  <IconButton icon="more" variant="ghost" accessibilityLabel="More" />
);

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

const variations: [string, React.JSX.Element][] = [
  ['Title only', <Card key="title" title="api-gateway" />],
  ['Anatomy', <DeployCard key="anatomy" />],
  ['Media', <MediaCard key="media" />],
  ['Pressable', <PressableCard key="pressable" />],
  ['Grid', <CardGrid key="grid" />],
];
