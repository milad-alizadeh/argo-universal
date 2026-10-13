import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { Spinner } from './spinner';

const meta = {
  title: 'Design System/Primitives/Spinner',
  component: Spinner,
  args: { label: 'Loading Sessions' },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Spinner',
  render: (args) => (
    <VariationList>
      <Variation label="Loading">
        <Spinner {...args} />
      </Variation>
    </VariationList>
  ),
};
