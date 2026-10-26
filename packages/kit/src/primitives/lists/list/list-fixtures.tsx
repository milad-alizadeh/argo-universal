import { Icon } from '#primitives/content/icon';
import { FieldGroup } from '#primitives/fields/field-group';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import type { ListProps } from './list-props';

const children = (
  <>
    <List.Section title="Section one" footer="Footer">
      <ListItem title="Item" leading={<Icon size="sm" name="agent" />} />
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

export const cardsList = {
  appearance: 'cards',
  maxHeight: 400,
  children,
} satisfies ListProps<unknown>;

export const filledCardsList = {
  ...cardsList,
  cardStyle: 'filled',
} satisfies ListProps<unknown>;

const branches = Array.from(
  { length: 12 },
  (_, index) => `feature/branch-${index + 1}`,
);

const onPress = (): void => undefined;

// FieldGroup's own rows as cells of a long, scrolling List, one card per section as a FieldGroup draws them.
const groupedChildren = (
  <>
    <List.Section title="Recent" footer="The branches you used last.">
      <FieldGroup.Value title="Current" value="main" leading="settings" />
      <FieldGroup.Link title="develop" onPress={onPress} />
      <FieldGroup.Link title="release" onPress={onPress} />
    </List.Section>
    <List.Section title="All branches">
      {branches.map((branch) => (
        <FieldGroup.Link key={branch} title={branch} onPress={onPress} />
      ))}
    </List.Section>
  </>
);

export const groupedList = {
  appearance: 'grouped',
  maxHeight: 520,
  children: groupedChildren,
} satisfies ListProps<unknown>;

// ListItem rows in a grouped List: the phones draw each section as a card of rounded ends, with a title and footer.
export const groupedItemsList = {
  appearance: 'grouped',
  maxHeight: 520,
  children,
} satisfies ListProps<unknown>;
