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
  argTypes: {
    onMenu: { action: 'open navigation' },
    onSearch: { action: 'search' },
    onFilter: { action: 'filter' },
  },
} satisfies Meta<typeof PhoneListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Title: Story = {
  render: (args) => (
    <Variations>
      {['Sessions', 'Issues', 'Atlas', 'Settings'].map((title) => (
        <Variation key={title} label={title}>
          <PhoneListHeader {...args} title={title} />
        </Variation>
      ))}
    </Variations>
  ),
};
