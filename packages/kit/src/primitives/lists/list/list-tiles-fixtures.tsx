import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Image } from '#primitives/content/image';
import { Text } from '#primitives/content/text';
import type { ListProps } from './list-props';

const headingRole = 'heading';

export const image = {
  pluginId: 'example',
  hash: 'a'.repeat(64),
  format: 'jpeg',
} as const;

const metrics = Array.from({ length: 80 }, (_, index) => ({
  id: String(index),
  title: `Metric ${index + 1}`,
}));

export type Metric = (typeof metrics)[number];

// The rows and how a row is keyed are callbacks, which stay in the story.
type TilesFixture<Item> = Omit<ListProps<Item>, 'renderItem' | 'keyExtractor'>;

export const autoColumnsList = {
  testID: 'metrics-wall',
  layout: 'grid',
  columns: 'auto',
  tileSize: 'sm',
  aspect: 'landscape',
  items: metrics,
} as const satisfies TilesFixture<Metric>;

export const shelfList = {
  direction: 'horizontal',
  tileSize: 'sm',
  header: <Text role={headingRole}>Attachments</Text>,
  items: metrics,
} as const satisfies TilesFixture<Metric>;

export type MediaItem = (typeof mediaItems)[number];

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
  { title: 'Folder', media: <Icon name="folder" size="lg" /> },
  { title: 'Summary', media: <Text role="title">42</Text> },
];

export const mediaList = {
  layout: 'grid',
  columns: 4,
  items: mediaItems,
} as const satisfies TilesFixture<MediaItem>;
