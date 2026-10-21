import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { ListDetail, type ListDetailProps } from './index';
import { ExampleListDetail, issues, projects } from './list-detail.mocks';

// Each variation holds its own selection; the story's args only satisfy the component's type.
const args: ListDetailProps = { list: null };

const meta = {
  title: 'Design System/Primitives/Scaffolds/ListDetail',
  component: ListDetail,
  argTypes: kitArgTypes('ListDetail'),
  args,
} satisfies Meta<typeof ListDetail>;

export default meta;

const examples = [
  {
    label: 'Issues, one selected',
    example: issues,
    initial: '412',
  },
  {
    label: 'Projects, one selected',
    example: projects,
    initial: 'argo-universal',
  },
  { label: 'Nothing selected', example: issues },
];

// Below the wide breakpoint each example drills in: the list, then the selected item with Back.
export const Overview: StoryObj<typeof meta> = {
  name: 'ListDetail',
  render: () => (
    <Variations>
      {examples.map(({ label, example, initial }) => (
        <Variation key={label} label={label}>
          <View className="h-120">
            <ExampleListDetail example={example} initial={initial} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
