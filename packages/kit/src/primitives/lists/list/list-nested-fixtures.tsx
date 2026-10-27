import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import { Pill } from '#primitives/status/pill';
import type { ListProps } from './list-props';

const onSelect = (): void => undefined;

/*
 * Child ListItems under their parents: an open parent's children, a selected child, a last child whose rail ends, a
 * child that holds children of its own, a row with none beside them, and a second parent.
 */
const nestedChildren = (
  <>
    <ListItem
      key="parent"
      title="Parent item"
      subtitle="A-1"
      leading={<Icon name="agent" />}
      meta={<Pill text="Label" />}
      onPress={onSelect}
    >
      <ListItem
        key="child-one"
        title="Child item"
        subtitle="A-2"
        leading={<Icon name="agent" />}
        onPress={onSelect}
      />
      <ListItem
        key="child-two"
        title="Selected child item"
        subtitle="A-3"
        leading={<Icon name="agent" />}
        selected
        onPress={onSelect}
      >
        <ListItem
          key="grandchild"
          title="Grandchild item"
          subtitle="A-4"
          leading={<Icon name="agent" />}
          onPress={onSelect}
        />
      </ListItem>
      <ListItem
        key="child-last"
        title="Last child item"
        subtitle="A-5"
        leading={<Icon name="agent" />}
        onPress={onSelect}
      />
    </ListItem>
    <ListItem
      key="single"
      title="Item without children"
      subtitle="A-6"
      leading={<Icon name="agent" />}
      onPress={onSelect}
    />
    <ListItem
      key="second-parent"
      title="Second parent item"
      subtitle="A-7"
      leading={<Icon name="agent" />}
      onPress={onSelect}
    >
      <ListItem
        key="second-child"
        title="Its only child"
        subtitle="A-8"
        leading={<Icon name="agent" />}
        onPress={onSelect}
      />
    </ListItem>
  </>
);

export const nestedList = {
  appearance: 'plain',
  density: 'compact',
  maxHeight: 400,
  children: nestedChildren,
} satisfies ListProps<unknown>;

export const nestedRegularList = {
  appearance: 'plain',
  maxHeight: 600,
  children: nestedChildren,
} satisfies ListProps<unknown>;
