import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ListDetail, type ListDetailProps } from './index';
import { ExampleListDetail, issues, projects } from './list-detail.mocks';

// Each story holds its own selection; the meta args only satisfy the component's type.
const args: ListDetailProps = { list: null };

const meta = {
  title: 'Design System/Primitives/Scaffolds/ListDetail',
  component: ListDetail,
  argTypes: kitArgTypes('ListDetail'),
  args,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-120">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ListDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Each story keeps its own render: the selection is state the example holds, not a prop
 * ListDetail takes. Below the wide breakpoint each one drills in: the list, then the selected
 * item with Back.
 */
export const IssueSelected: Story = {
  render: () => <ExampleListDetail example={issues} initial="412" />,
};

export const ProjectSelected: Story = {
  render: () => (
    <ExampleListDetail example={projects} initial="argo-universal" />
  ),
};

export const NothingSelected: Story = {
  render: () => <ExampleListDetail example={issues} />,
};
