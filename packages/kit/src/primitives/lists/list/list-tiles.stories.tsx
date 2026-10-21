import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Image } from '#primitives/content/image';
import { ListItem } from '#primitives/lists/list-item';
import { Svg } from '#primitives/visual';
import { List } from './list';
import {
  autoColumnsList,
  image,
  mediaList,
  shelfList,
  type MediaItem,
  type Metric,
} from './list-tiles-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/List tiles',
  component: List,
  argTypes: kitArgTypes('List'),
  parameters: { screenPreview: true },
  // Not includeStories: React Native Storybook drops the default export from files that use it.
  excludeStories: ['GridExample'],
} satisfies Meta;

export default meta;

type Story = StoryObj;

const artwork =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><path d="M0 85L30 55L60 70L90 25L120 40L160 10" stroke="currentColor" stroke-width="3" fill="none"/></svg>';

export function GridExample(): React.JSX.Element {
  const [selected, select] = useState('0');

  return (
    <List
      {...autoColumnsList}
      keyExtractor={metricKey}
      extraData={selected}
      renderItem={(item: Metric) => (
        <ListItem {...metricProps(item, selected, select)} />
      )}
    />
  );
}

function metricKey(item: Metric): string {
  return item.id;
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
  render: () => (
    <List {...shelfList} keyExtractor={metricKey} renderItem={thumbnailRow} />
  ),
};

export const Media: Story = {
  render: () => (
    <List
      {...mediaList}
      renderItem={(item: MediaItem) => <ListItem {...item} />}
    />
  ),
};
