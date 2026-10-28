import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from './list';
import { board, column } from './list-moves-fixtures';
import { MovesExample } from './list-moves.mocks';

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

export const Board: Story = {
  args: board,
  render: (args) => <MovesExample {...args} />,
};

export const Column: Story = {
  args: column,
  render: (args) => <MovesExample {...args} />,
};
