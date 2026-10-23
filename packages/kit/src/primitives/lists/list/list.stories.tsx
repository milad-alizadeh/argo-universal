import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from './list';
import { cardsList, plainList } from './list-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/List',
  component: List,
  argTypes: kitArgTypes('List'),
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = { args: plainList };

export const Cards: Story = { args: cardsList };
