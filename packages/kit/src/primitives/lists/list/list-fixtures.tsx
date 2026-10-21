import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import type { ListProps } from './list-props';

const children = (
  <>
    <List.Section title="Section one" footer="Footer">
      <ListItem title="Item" leading={<Icon role="body" name="agent" />} />
      <ListItem title="Item" subtitle="Subtitle" />
    </List.Section>
    <List.Section title="Section two">
      <ListItem title="Item" subtitle="Subtitle" />
    </List.Section>
  </>
);

export const plainList = {
  appearance: 'plain',
  maxHeight: 400,
  children,
} satisfies ListProps<unknown>;

export const groupedList = {
  appearance: 'grouped',
  maxHeight: 400,
  children,
} satisfies ListProps<unknown>;

export const cardsList = {
  appearance: 'cards',
  maxHeight: 400,
  children,
} satisfies ListProps<unknown>;
