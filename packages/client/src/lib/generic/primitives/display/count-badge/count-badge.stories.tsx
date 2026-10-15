import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations as VariationList } from '../../../variations';
import { CountBadge } from './count-badge';

const meta = {
  title: 'Design System/Primitives/CountBadge',
  component: CountBadge,
} satisfies Meta<typeof CountBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'CountBadge',
  render: () => (
    <VariationList>
      <Variation label="Count">
        <CountBadge badge={{ count: 3, label: '3 Sessions need attention' }} />
      </Variation>
      <Variation label="Over 99">
        <CountBadge badge={{ count: 120 }} />
      </Variation>
    </VariationList>
  ),
};
