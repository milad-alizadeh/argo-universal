import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Image } from '#primitives/content/image';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { Svg } from '#primitives/visual';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { List } from './list';

const meta = {
  title: 'Design System/Primitives/Lists/List tiles',
  component: List,
  argTypes: kitArgTypes('List'),
  parameters: { screenPreview: true },
  includeStories: ['AutoColumns', 'Shelf', 'Media'],
} satisfies Meta;

export default meta;

type Story = StoryObj;

const headingRole = 'heading';

const artwork =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><path d="M0 85L30 55L60 70L90 25L120 40L160 10" stroke="currentColor" stroke-width="3" fill="none"/></svg>';

const image = {
  pluginId: 'hello',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

const metrics = Array.from({ length: 80 }, (_, index) => ({
  id: String(index),
  title: `Metric ${index + 1}`,
}));

type Metric = (typeof metrics)[number];

const gridDefaults = {
  testID: 'metrics-wall',
  layout: 'grid',
  columns: 'auto',
  tileSize: 'sm',
  aspect: 'landscape',
  items: metrics,
  keyExtractor: (item: Metric) => item.id,
} as const;

export function GridExample(): React.JSX.Element {
  const [selected, select] = useState('0');

  return (
    <List
      {...gridDefaults}
      extraData={selected}
      renderItem={(item: Metric) => (
        <ListItem {...metricProps(item, selected, select)} />
      )}
    />
  );
}

function metricProps(
  item: Metric,
  selected: string,
  select: (id: string) => void,
): React.ComponentProps<typeof ListItem> {
  return {
    title: item.title,
    subtitle: 'Latest reading',
    media: <Svg xml={artwork} label={`${item.title} trend`} />,
    selected: selected === item.id,
    onPress: () => select(item.id),
  };
}

export const AutoColumns: Story = { render: () => <GridExample /> };

const shelfDefaults = {
  direction: 'horizontal',
  tileSize: 'sm',
  header: <Text role={headingRole}>Attachments</Text>,
  items: metrics,
  keyExtractor: (item: Metric) => item.id,
} as const;

function thumbnailRow(item: Metric): React.JSX.Element {
  return (
    <ListItem
      title={item.title}
      subtitle="Caption"
      media={
        <Image source={image} accessibilityLabel={`${item.title} preview`} />
      }
    />
  );
}

export const Shelf: Story = {
  render: () => <List {...shelfDefaults} renderItem={thumbnailRow} />,
};

const mediaItems = [
  {
    title: 'Picture',
    media: <Image source={image} accessibilityLabel="Screenshot" />,
  },
  {
    title: 'Person',
    media: (
      <Avatar name="Sam Rivera" accessibilityLabel="Sam Rivera" size="xl" />
    ),
  },
  { title: 'Folder', media: <Icon name="folder" role="title" /> },
  { title: 'Summary', media: <Text role="title">42</Text> },
];

export const Media: Story = {
  render: () => (
    <List
      layout="grid"
      columns={4}
      items={mediaItems}
      renderItem={(item) => <ListItem {...item} />}
    />
  ),
};
