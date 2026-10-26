import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List } from './list';
import {
  logList,
  pagedList,
  searchedList,
  selectedList,
} from './list-behaviours-fixtures';
import {
  LogExample,
  PagedExample,
  SelectionExample,
} from './list-behaviours.mocks';

const meta = {
  title: 'Design System/Primitives/Lists/List/Behaviours',
  component: List<string>,
  argTypes: kitArgTypes('List'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof List<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pagination: Story = {
  args: pagedList,
  render: (args) => <PagedExample {...args} />,
};

export const Selection: Story = {
  args: selectedList,
  render: (args) => <SelectionExample {...args} />,
};

export const Search: Story = { args: searchedList };

export const Log: Story = {
  args: logList,
  render: (args) => <LogExample {...args} />,
};
