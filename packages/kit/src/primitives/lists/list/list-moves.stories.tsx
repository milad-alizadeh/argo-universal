import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from './list';
import { board, column, type MovesProps } from './list-moves-fixtures';
import { GroupedMovesExample, MovesExample } from './list-moves.mocks';
import type { ListProps } from './list-props';

/*
 * Rows a List moves: dragged on every platform, or chosen from a row's context menu. On a wide desktop or web window
 * a board draws each Section as a lane; phones and narrow windows stack the same Sections as a List's.
 */
const meta = {
  title: 'Design System/Primitives/Lists/List/Moves',
  component: List<never>,
  argTypes: kitArgTypes('List'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof List<never>>;

export default meta;

type Story = StoryObj<typeof meta>;

// The controls offer every layout; a grid's rows do not move, so the example draws it as a column.
const movable = (layout: ListProps<never>['layout']): MovesProps['layout'] =>
  layout === 'grid' ? 'list' : layout;

export const Board: Story = {
  args: board,
  render: (args) => <MovesExample {...args} layout={movable(args.layout)} />,
};

export const Column: Story = {
  args: column,
  render: (args) => <MovesExample {...args} layout={movable(args.layout)} />,
};

// FieldGroup rows, which iOS and Android draw as their own grouped list: a row moves from its long-press menu.
export const Grouped: Story = {
  render: () => <GroupedMovesExample />,
};

// Value rows have no press of their own: they move from their long-press menu, and a tap does nothing.
export const GroupedReadOnly: Story = {
  render: () => <GroupedMovesExample readOnly />,
};
