import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { PhoneListHeader } from './PhoneListHeader';

const meta = {
  title: 'Shell/PhoneListHeader',
  component: PhoneListHeader,
  args: {
    title: 'Sessions',
    onMenu: action('open navigation'),
    onSearch: action('search'),
    onFilter: action('filter'),
  },
} satisfies Meta<typeof PhoneListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'PhoneListHeader',
  render: (args) => (
    <Variations>
      {[
        { label: 'No attention', count: 0 },
        { label: 'One Session needs attention', count: 1 },
        { label: 'More than 99 need attention', count: 100 },
      ].map(({ label, count }) => (
        <Variation key={label} label={label}>
          <PhoneListHeader {...args} attentionCount={count} />
        </Variation>
      ))}
    </Variations>
  ),
};
