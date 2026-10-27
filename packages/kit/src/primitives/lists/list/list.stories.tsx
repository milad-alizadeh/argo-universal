import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from './list';
import {
  cardsList,
  compactList,
  groupedItemsList,
  groupedList,
  plainList,
} from './list-fixtures';
import { nestedList, nestedRegularList } from './list-nested-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/List',
  component: List,
  argTypes: kitArgTypes('List'),
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = { args: plainList };

export const Cards: Story = { args: cardsList };

export const Grouped: Story = {
  args: groupedList,
  parameters: { screenPreview: true },
};

export const GroupedItems: Story = {
  args: groupedItemsList,
  parameters: { screenPreview: true },
};

// Each row one line on a wide window; phones draw regular rows.
export const Compact: Story = { args: compactList };

// Child ListItems under their parents, in the tree lane: chevrons on parents, rails beside children, an elbow on a last child.
export const Nested: Story = { args: nestedList };

// The same tree in regular rows: the lane runs each row's full height.
export const NestedRegular: Story = { args: nestedRegularList };

// A folded parent hides its children behind a closed chevron.
export const NestedFolded: Story = {
  args: nestedList,
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole('button', {
      name: 'Second parent item',
      expanded: true,
    });

    await userEvent.click(toggle);
    await expect(canvas.queryByText('Its only child')).toBeNull();
  },
};
