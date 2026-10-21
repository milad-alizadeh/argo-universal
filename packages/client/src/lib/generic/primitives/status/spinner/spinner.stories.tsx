import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Variation, Variations as VariationList } from '../../../variations';
import { Spinner } from './spinner';

const meta = {
  title: 'Design System/Primitives/Status/Spinner',
  component: Spinner,
  argTypes: kitArgTypes('Spinner'),
  args: { accessibilityLabel: 'Loading' },
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
